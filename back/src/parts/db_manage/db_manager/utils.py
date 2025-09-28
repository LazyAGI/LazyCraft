# Copyright (c) 2025 SenseTime. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Additional Notice:
# When modifying, redistributing, or creating derivative works of this software,
# you must retain the original LazyCraft logo and the GitHub link icon that directs
# to the official repository: https://github.com/LazyAGI/LazyLLM

from collections import defaultdict
from typing import Any, Optional

from parts.db_manage.db_manager.dialect import DialectAdapter


def group_foreign_key(foreign_key_infos: list[dict]) -> dict[str, list[dict]]:
    """将外键信息按引用的表名进行分组。

    Args:
        foreign_key_infos (list[dict]): 外键信息列表，每个字典包含外键详情

    Returns:
        dict[str, list[dict]]: 以引用表名为键，对应外键信息列表为值的字典
    """
    if not foreign_key_infos:
        return {}
    grouped = defaultdict(list)
    for info in foreign_key_infos:
        grouped[info["referred_table"]].append(info)
    return grouped


def group_unique_list(unique_keys: list[dict]) -> list[dict]:
    """将唯一键约束按约束名称进行分组。

    将单独的唯一键列信息合并为完整的复合唯一键约束。

    Args:
        unique_keys (list[dict]): 唯一键列表，每个字典包含列名和约束名

    Returns:
        list[dict]: 分组后的唯一键约束列表，每个字典包含列名列表和约束名
    """
    if not unique_keys:
        return []
    groups = []
    for uk in unique_keys:
        existing = next(
            (g for g in groups if uk.get("name") and uk["name"] == g["name"]), None
        )
        if existing:
            existing["column_names"].append(uk["column_name"])
        else:
            groups.append({"column_names": [uk["column_name"]], "name": uk["name"]})
    return groups


def determine_operation(
    existing_columns: list[dict], new_columns: list[dict], column: dict
) -> str:
    """确定列的操作类型（增加、删除、修改或无变化）。

    通过比较现有列和新列的定义，确定对指定列需要执行的操作。

    Args:
        existing_columns (list[dict]): 现有的列定义列表
        new_columns (list[dict]): 新的列定义列表
        column (dict): 要检查的列定义

    Returns:
        str: 操作类型，可能的值为：'add'、'del'、'modify'、'none'
    """
    column_name = column.get("name")
    existing = next(
        (col for col in existing_columns if col["name"] == column_name), None
    )
    new_col = next((col for col in new_columns if col["name"] == column_name), None)

    if not existing:
        return "add"
    if not new_col:
        return "del"
    if any(
        existing.get(k) != column.get(k)
        for k in ["type", "nullable", "default", "comment"]
    ):
        return "modify"
    return "none"


def union_of_dict_lists(list1: list[dict], list2: list[dict], key: str) -> list[dict]:
    """合并两个字典列表，去除重复项。

    根据指定的键值合并两个字典列表，后面的列表优先级更高。

    Args:
        list1 (list[dict]): 第一个字典列表
        list2 (list[dict]): 第二个字典列表（优先级更高）
        key (str): 用于判断重复项的键名

    Returns:
        list[dict]: 合并后的字典列表，不包含重复项
    """
    return list({item[key]: item for item in list2 + list1}.values())


def parse_column_default_val(type, default_val: str) -> Optional[str]:
    """解析并格式化列的默认值。

    根据列的数据类型处理默认值，包括去除类型转换语法、
    处理字符串引号、转换布尔值等。

    Args:
        type: 列的数据类型
        default_val (str): 原始默认值字符串

    Returns:
        Optional[str]: 格式化后的默认值，如果为空则返回None
    """
    if default_val and "::" in default_val:
        default_val = default_val.split("::")[0]
    if default_val:
        # 需要去除单引号的类型（包括带长度的类型）
        string_types = [
            "VARCHAR",
            "TEXT",
            "TIMESTAMP",
            "INT",
            "INTEGER",
            "TINYINT",
            "BIGINT",
        ]
        decimal_types = ["DECIMAL", "NUMERIC"]

        # 检查是否为需要去除单引号的类型
        type_str = str(type)
        if any(type_str.startswith(t) for t in string_types + decimal_types):
            if default_val.startswith("'") and default_val.endswith("'"):
                default_val = default_val[1:-1]

        # 处理 TINYINT 类型（转换为布尔值）
        if type_str in ["TINYINT"]:
            default_val = "true" if default_val == "1" else "false"
    return default_val


def unique_check(column_name: str, unique_keys: list[dict]) -> dict[str, Any]:
    """检查指定列是否具有唯一约束。

    Args:
        column_name (str): 要检查的列名
        unique_keys (list[dict]): 唯一键约束列表

    Returns:
        dict[str, Any]: 包含唯一性检查结果的字典，
                       包含'is_unique'布尔值和'name'约束名称
    """
    flat_unique = [
        {"column_name": col, "name": uk["name"]}
        for uk in unique_keys
        for col in uk["column_names"]
    ]
    match = next((uk for uk in flat_unique if uk["column_name"] == column_name), None)
    return {"is_unique": bool(match), "name": match["name"] if match else None}


def build_foreign_key_sql(
    adapter: DialectAdapter, table_name: str, foreign_key_infos: list[dict]
) -> list[str]:
    """构建添加外键约束的SQL语句。

    根据外键信息生成ALTER TABLE语句来添加外键约束。

    Args:
        adapter (DialectAdapter): 数据库方言适配器
        table_name (str): 目标表名
        foreign_key_infos (list[dict]): 外键信息列表

    Returns:
        list[str]: 外键约束的SQL语句列表
    """
    sqls = []
    grouped = group_foreign_key(foreign_key_infos)
    for ref_table, cols in grouped.items():
        local_cols = ", ".join(c["constrained_column"] for c in cols)
        ref_cols = ", ".join(c["referred_column"] for c in cols)
        sqls.append(
            f"ALTER TABLE {adapter.get_full_table_name(table_name)} "
            f"ADD FOREIGN KEY ({local_cols}) REFERENCES {adapter.get_full_table_name(ref_table)} ({ref_cols})"
        )
    return sqls
