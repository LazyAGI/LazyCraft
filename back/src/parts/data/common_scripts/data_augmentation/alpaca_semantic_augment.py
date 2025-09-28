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

"""数据增强 —— 语序改写：
- 对 input/output 字段做语序调整，保证语义不变
- 利用 LLM 重写语句，增加句式灵活性
- 提升 Alpaca 格式模型对语法变化的鲁棒性
"""


from lazyllm import ChatPrompter, OnlineChatModule

# 初始化 LLM
gen_prompt = """
请对以下句子进行不改变意思的语序调整，返回 {n} 种不同表达，每种一行：
示例：
原句：他每天早上在公园里跑步。
改写：
每天早上，他在公园里跑步。
他在公园里每天早上跑步。
在公园里，他每天早上跑步。
"""

llm = OnlineChatModule().prompt(ChatPrompter(gen_prompt))


def is_valid_sample(sample: dict) -> bool:
    """判断一条数据是否符合结构规范"""
    if not isinstance(sample, dict):
        return False
    if (
        "instruction" not in sample
        or not isinstance(sample["instruction"], str)
        or not sample["instruction"].strip()
    ):
        return False
    if (
        "output" not in sample
        or not isinstance(sample["output"], str)
        or not sample["output"].strip()
    ):
        return False
    return True


def shuffle_sentence_variants(text: str, n: int = 3) -> list[str]:
    """调用 LLM 获取 n 个语序改写版本"""
    try:
        response = llm(text)
        lines = [line.strip() for line in response.split("\n") if line.strip()]
        unique_lines = list({text.strip()} | set(lines))
        return unique_lines[: n + 1]
    except Exception as e:
        print(f"[语序改写失败] {e}")
        return [text]


def semantic_augment(sample: dict[str, str], n: int = 3) -> list[dict[str, str]]:
    """返回原样本 + n条语序改写增强样本"""
    if not is_valid_sample(sample):
        return []

    text_field = "input" if sample.get("input").strip() else "output"
    text = sample.get(text_field, "").strip()

    variants = shuffle_sentence_variants(text, n=n)
    results = [sample]

    seen = set()
    seen.add(text.strip())

    for new_text in variants:
        if new_text not in seen:
            seen.add(new_text)
            new_sample = sample.copy()
            new_sample[text_field] = new_text
            results.append(new_sample)

    return results


if __name__ == "__main__":
    sample = {
        "instruction": "请描述你理想中的一天。",
        "input": "",
        "output": "我理想中的一天是早晨喝咖啡，中午与朋友聚餐，晚上散步放松。",
    }

    augmented = semantic_augment(sample, n=3)

    print("增强样本如下：")
    for i, item in enumerate(augmented, 1):
        print(f"\n样本 {i}:")
        print(item)
