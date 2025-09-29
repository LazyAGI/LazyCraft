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

from app import app
from models.model_account import Account
from parts.tag.model import Tag
from utils.util_database import db

DATA = {
    "app": "效率工具、文本创作、灵感提升、代码助手、图像与音频、专业服务、学习教育、办公助手、生活娱乐",
    "knowledgebase": "项目、财务、人事、采销、IT、教学、客服、产品、研发",
    "prompt": "代码助手、角色扮演、任务执行、通用结构、技能调用、知识库问答、平台内置",
    "model": "长文本、工具调用、Text2SQL、文本评估、通用、分类、主体提取、代码",
    "tool": "图像、阅读、实用工具、便利生活、内容搜索、科学教育、游戏娱乐、金融商业",
    "mcp": "图像、阅读、实用工具、便利生活、内容搜索、科学教育、游戏娱乐、金融商业",
    "dataset": "文本问答、文本分类、Text2SQL、文本生成、翻译、人类偏好对齐、单项选择、数学、代码",
}


def main():
    """主函数，初始化所有预定义的标签数据。

    遍历 DATA 字典中的所有标签类型和标签名称，检查数据库中是否已存在相应标签。
    如果不存在则创建新标签，如果已存在则更新其租户ID为管理员ID。

    标签将被分配给系统管理员账户。
    """
    with app.app_context():
        for _type, line in DATA.items():
            for name in [k.strip() for k in line.split("、") if k.strip()]:
                tag = Tag.query.filter_by(type=_type, name=name).first()
                if not tag:
                    tag = Tag(type=_type, name=name)
                    tag.tenant_id = Account.get_administrator_id()
                    db.session.add(tag)
                    db.session.commit()
                else:
                    tag.tenant_id = Account.get_administrator_id()
                    db.session.commit()

                print(f"create {_type} {name}")


if __name__ == "__main__":
    main()
