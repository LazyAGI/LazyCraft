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

import csv
import json
import logging
import os

import pandas as pd

try:
    from datasets import load_dataset
except ImportError:
    pass


class TransformJsonTool:
    """JSON转换工具类，用于将不同格式的数据文件转换为JSON格式。

    支持多种数据格式的转换，包括Alpaca预训练、Alpaca微调、ShareGPT微调和OpenAI微调格式。
    支持多种输入文件格式：txt、csv、parquet、jsonl、json。

    Attributes:
        None: 此类不包含实例属性。
    """

    def transform_to_json(self, file_path, data_format):
        """将指定格式的数据文件转换为JSON格式。

        Args:
            file_path (str): 输入文件路径。
            data_format (str): 数据格式类型，支持以下格式：
                - "Alpaca_pre_train": Alpaca预训练格式
                - "Alpaca_fine_tuning": Alpaca微调格式
                - "Sharegpt_fine_tuning": ShareGPT微调格式
                - "Openai_fine_tuning": OpenAI微调格式

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息
        """
        file_name = os.path.basename(file_path)  # 获取文件名（包括扩展名）
        file_name_without_extension, file_extension = os.path.splitext(
            file_name
        )  # 分离文件名和扩展名
        directory = os.path.dirname(file_path)
        if data_format == "Alpaca_pre_train":
            print("aaa")
            new_file_name = f"{file_name_without_extension}_train.json"
            return self.transform_alpaca_pre_train(
                file_path, os.path.join(directory, new_file_name)
            )
        if data_format == "Alpaca_fine_tuning":
            new_file_name = f"{file_name_without_extension}_fine_tuning.json"
            return self.transform_alpaca_fine_tuning(
                file_path, os.path.join(directory, new_file_name)
            )
        if data_format == "Sharegpt_fine_tuning":
            new_file_name = f"{file_name_without_extension}_sharegpt.json"
            return self.transform_sharegpt_fine_tuning(
                file_path, os.path.join(directory, new_file_name)
            )
        if data_format == "Openai_fine_tuning":
            new_file_name = f"{file_name_without_extension}_openai.json"
            return self.transform_openai_fine_tuning(
                file_path, os.path.join(directory, new_file_name)
            )

        return False, f"{data_format}不符合解析格式，解析失败"

    def transform_alpaca_pre_train(self, file_path, new_file_path):
        """将文件转换为Alpaca预训练格式。

        Args:
            file_path (str): 输入文件路径。
            new_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息
        """
        file_name = os.path.basename(file_path)
        if file_name.endswith(".txt"):
            return self.transform_alpaca_pre_train_by_txt(file_path, new_file_path)
        elif file_name.endswith(".csv"):
            return self.transform_alpaca_pre_train_by_csv(file_path, new_file_path)
        elif file_name.endswith(".parquet"):
            return self.transform_alpaca_pre_train_by_parquet(file_path, new_file_path)
        elif file_name.endswith(".jsonl"):
            return self.transform_alpaca_pre_train_by_jsonl(file_path, new_file_path)
        elif file_name.endswith(".json"):
            return True, file_path
        return False, "不符合解析的文件类型，解析失败"

    def transform_alpaca_fine_tuning(self, file_path, new_file_path):
        """将文件转换为Alpaca微调格式。

        Args:
            file_path (str): 输入文件路径。
            new_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息
        """
        file_name = os.path.basename(file_path)
        if file_name.endswith(".csv"):
            return self.transform_alpaca_fine_tuning_by_csv(file_path, new_file_path)
        elif file_name.endswith(".parquet"):
            return self.transform_alpaca_fine_tuning_by_parquet(
                file_path, new_file_path
            )
        elif file_name.endswith(".jsonl"):
            return self.transform_alpaca_fine_tuning_by_jsonl(file_path, new_file_path)
        elif file_name.endswith(".json"):
            return True, file_path
        return False, "不符合解析的文件类型，解析失败"

    def transform_sharegpt_fine_tuning(self, file_path, new_file_path):
        """将文件转换为ShareGPT微调格式。

        Args:
            file_path (str): 输入文件路径。
            new_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息
        """
        file_name = os.path.basename(file_path)
        if file_name.endswith(".csv"):
            return self.transform_sharegpt_fine_tuning_by_csv(file_path, new_file_path)
        elif file_name.endswith(".parquet"):
            return self.transform_sharegpt_fine_tuning_by_parquet(
                file_path, new_file_path
            )
        elif file_name.endswith(".jsonl"):
            return self.transform_sharegpt_fine_tuning_by_jsonl(
                file_path, new_file_path
            )
        elif file_name.endswith(".json"):
            return True, file_path
        return False, "不符合解析的文件类型，解析失败"

    def transform_openai_fine_tuning(self, file_path, new_file_path):
        """将文件转换为OpenAI微调格式。

        Args:
            file_path (str): 输入文件路径。
            new_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息
        """
        file_name = os.path.basename(file_path)
        if file_name.endswith(".csv"):
            return self.transform_openai_fine_tuning_by_csv(file_path, new_file_path)
        elif file_name.endswith(".parquet"):
            return self.transform_openai_fine_tuning_by_parquet(
                file_path, new_file_path
            )
        elif file_name.endswith(".jsonl"):
            return self.transform_openai_fine_tuning_by_jsonl(file_path, new_file_path)
        elif file_name.endswith(".json"):
            return True, file_path
        return False, "不符合解析的文件类型，解析失败"

    def transform_alpaca_pre_train_by_txt(self, txt_file_path, json_file_path):
        """将TXT文件转换为Alpaca预训练格式。

        Args:
            txt_file_path (str): 输入TXT文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            data = []
            with open(txt_file_path, encoding="utf-8") as txt_file:
                for line in txt_file:
                    line = line.strip()
                    if line:
                        data.append({"text": line})

            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_pre_train txt转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_pre_train_by_csv(self, csv_file_path, json_file_path):
        """将CSV文件转换为Alpaca预训练格式。

        Args:
            csv_file_path (str): 输入CSV文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            data = []
            with open(csv_file_path, encoding="utf-8") as csv_file:
                csv_reader = csv.DictReader(csv_file)
                for row in csv_reader:
                    text = (
                        f"### Instruction:\n {row['instruction']}\n\n"
                        f"### Input: \n{row['input']}\n\n"
                        f"### Output:\n{row['output']}"
                    )
                    new_row = {"text": text}
                    data.append(new_row)

            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_pre_train csv转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_pre_train_by_parquet(self, parquet_file_path, json_file_path):
        """将Parquet文件转换为Alpaca预训练格式。

        Args:
            parquet_file_path (str): 输入Parquet文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # parquet_file_path = 'tatsu-lab-alpaca.parquet'
            # json_file_path = 'tatsu-lab-alpaca_train.json'

            df = pd.read_parquet(parquet_file_path)
            df_selected = df[["text"]]  # 保留需要的列
            df_selected.to_json(
                json_file_path,
                force_ascii=False,
                orient="records",
                lines=False,
                indent=4,
            )

            print("转换完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_pre_train parquet转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_pre_train_by_jsonl(self, jsonl_file_path, json_file_path):
        """将JSONL文件转换为Alpaca预训练格式。

        Args:
            jsonl_file_path (str): 输入JSONL文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # jsonl_file_path = 'geometry.jsonl'
            # json_file_path = 'geometry_train.json'

            dataset = load_dataset("json", data_files=jsonl_file_path)

            converted_data = []
            for item in dataset["train"]:
                converted_item = {
                    "text": "Problem: "
                    + item["problem"]
                    + "\nSolution: "
                    + item["solution"],
                }
                converted_data.append(converted_item)

            with open(json_file_path, "w", encoding="utf-8") as file:
                json.dump(converted_data, file, ensure_ascii=False, indent=4)

            print("转换完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_pre_train parquet转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_fine_tuning_by_csv(self, csv_file_path, json_file_path):
        """将CSV文件转换为Alpaca微调格式。

        Args:
            csv_file_path (str): 输入CSV文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # csv_file_path = 'alpaca_gpt4_data_zh.csv'
            # json_file_path = 'alpaca_gpt4_data_zh.json'

            data = []
            with open(csv_file_path, encoding="utf-8") as csv_file:
                csv_reader = csv.DictReader(csv_file)
                for row in csv_reader:
                    data.append(row)
            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_fine_tuning csv转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_fine_tuning_by_parquet(
        self, parquet_file_path, json_file_path
    ):
        """将Parquet文件转换为Alpaca微调格式。

        Args:
            parquet_file_path (str): 输入Parquet文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # parquet_file_path = 'tatsu-lab-alpaca.parquet'
            # json_file_path = 'tatsu-lab-alpaca.json'

            df = pd.read_parquet(parquet_file_path)
            df_selected = df[["instruction", "input", "output"]]  # 保留需要的列
            df_selected.to_json(
                json_file_path,
                force_ascii=False,
                orient="records",
                lines=False,
                indent=4,
            )

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_fine_tuning parquet转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_alpaca_fine_tuning_by_jsonl(self, jsonl_file_path, json_file_path):
        """将JSONL文件转换为Alpaca微调格式。

        Args:
            jsonl_file_path (str): 输入JSONL文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # jsonl_file_path = 'geometry.jsonl'
            # json_file_path = 'geometry.json'

            dataset = load_dataset("json", data_files=jsonl_file_path)

            converted_data = []
            for item in dataset["train"]:
                converted_item = {
                    "instruction": item["problem"],
                    "input": "",
                    "output": item["solution"],
                }
                converted_data.append(converted_item)

            with open(json_file_path, "w", encoding="utf-8") as file:
                json.dump(converted_data, file, ensure_ascii=False, indent=4)

            print("解析完成，文件已保存为: ", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error alpaca_fine_tuning jsonl转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_sharegpt_fine_tuning_by_csv(self, csv_file_path, json_file_path):
        """将CSV文件转换为ShareGPT微调格式。

        Args:
            csv_file_path (str): 输入CSV文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # csv_file_path = 'alpaca_gpt4_data_zh.csv'
            # json_file_path = 'alpaca_gpt4_data_zh_gpt.json'

            data = []
            with open(csv_file_path, encoding="utf-8") as csv_file:
                csv_reader = csv.DictReader(csv_file)
                for row in csv_reader:
                    item = {
                        "conversations": [
                            {
                                "from": "human",
                                "value": (
                                    f"### Instruction:\n {row['instruction']}\n\n### Input: \n{row['input']}"
                                    if row["input"].strip()
                                    else row["instruction"]
                                ),
                            },
                            {"from": "gpt", "value": row["output"]},
                        ],
                        "system": "",
                        "tools": "",
                    }
                    data.append(item)
            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error sharegpt_fine_tuning csv转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_sharegpt_fine_tuning_by_parquet(
        self, parquet_file_path, json_file_path
    ):
        """将Parquet文件转换为ShareGPT微调格式。

        Args:
            parquet_file_path (str): 输入Parquet文件路径。
            json_file_path (str): 输出JSON文件路径。

        Returns:
            tuple: (bool, str) 转换结果元组，包含：
                - bool: 转换是否成功
                - str: 成功时返回输出文件路径，失败时返回错误信息

        Raises:
            Exception: 文件读取或写入异常时抛出。
        """
        try:
            # parquet_file_path = 'tatsu-lab-alpaca.parquet'
            # json_file_path = 'tatsu-lab-alpaca_gpt.json'

            df = pd.read_parquet(parquet_file_path)
            df_selected = df[["instruction", "input", "output"]]

            data = []
            for index, row in df_selected.iterrows():
                item = {
                    "conversations": [
                        {
                            "from": "human",
                            "value": (
                                f"### Instruction:\n {row['instruction']}\n\n### Input: \n{row['input']}"
                                if row["input"].strip()
                                else row["instruction"]
                            ),
                        },
                        {"from": "gpt", "value": row["output"]},
                    ],
                    "system": "",
                    "tools": "",
                }
                data.append(item)

            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error sharegpt_fine_tuning parquet转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_sharegpt_fine_tuning_by_jsonl(self, jsonl_file_path, json_file_path):
        try:
            # jsonl_file_path = 'geometry.jsonl'
            # json_file_path = 'geometry_train_gpt.json'

            dataset = load_dataset("json", data_files=jsonl_file_path)

            data = []
            for item in dataset["train"]:
                row = {k: v for k, v in item.items()}
                item_data = {
                    "conversations": [
                        {"from": "human", "value": row.get("problem", "")},
                        {"from": "gpt", "value": row.get("solution", "")},
                    ],
                    "system": "",
                    "tools": "",
                }
                data.append(item_data)

            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error sharegpt_fine_tuning jsonl转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_openai_fine_tuning_by_csv(self, csv_file_path, json_file_path):
        try:
            # csv_file_path = 'alpaca_gpt4_data_zh.csv'
            # json_file_path = 'alpaca_gpt4_data_zh_gpt.json'

            data = []
            with open(csv_file_path, encoding="utf-8") as csv_file:
                csv_reader = csv.DictReader(csv_file)
                for row in csv_reader:
                    item = {
                        "messages": [
                            {
                                "role": "user",
                                "content": (
                                    f"### Instruction:\n {row['instruction']}\n\n### Input: \n{row['input']}"
                                    if row["input"].strip()
                                    else row["instruction"]
                                ),
                            },
                            {"role": "assistant", "content": row["output"]},
                        ]
                    }
                    data.append(item)
            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error openai_fine_tuning csv转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_openai_fine_tuning_by_parquet(
        self, parquet_file_path, json_file_path
    ):
        try:
            # parquet_file_path = 'tatsu-lab-alpaca.parquet'
            # json_file_path = 'tatsu-lab-alpaca_gpt.json'

            df = pd.read_parquet(parquet_file_path)
            df_selected = df[["instruction", "input", "output"]]

            data = []
            for index, row in df_selected.iterrows():
                item = {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                f"### Instruction:\n {row['instruction']}\n\n### Input: \n{row['input']}"
                                if row["input"].strip()
                                else row["instruction"]
                            ),
                        },
                        {"role": "assistant", "content": row["output"]},
                    ]
                }
                data.append(item)
            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error openai_fine_tuning parquet转换json异常: {e}")
            return False, str(e)
        return True, json_file_path

    def transform_openai_fine_tuning_by_jsonl(self, jsonl_file_path, json_file_path):
        try:
            # jsonl_file_path = 'geometry.jsonl'
            # json_file_path = 'geometry_train_gpt.json'

            dataset = load_dataset("json", data_files=jsonl_file_path)

            data = []
            for item in dataset["train"]:
                row = {k: v for k, v in item.items()}
                item = {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                f"### Instruction:\n {row['instruction']}\n\n### Input: \n{row['input']}"
                                if row["input"].strip()
                                else row["instruction"]
                            ),
                        },
                        {"role": "assistant", "content": row["output"]},
                    ]
                }
                data.append(item)

            with open(json_file_path, mode="w", encoding="utf-8") as json_file:
                json.dump(data, json_file, ensure_ascii=False, indent=4)

            print("解析完成，JSON文件已生成：", json_file_path)
        except Exception as e:
            logging.exception(e)
            print(f"Error openai_fine_tuning jsonl转换json异常: {e}")
            return False, str(e)
        return True, json_file_path
