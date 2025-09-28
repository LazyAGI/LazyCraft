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

"""数据增强 —— 同义词替换：
- 对 instruction/input/output 字段进行 LLM 同义改写
- 保证语义不变，表述方式多样
- 适用于 Alpaca 格式数据增强，提升模型鲁棒性
"""

import itertools

from lazyllm import ChatPrompter, OnlineChatModule

llm = OnlineChatModule()


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


def make_paraphraser(n: int):
    """构造 paraphrase 提示词"""
    prompt = f"""请对以下句子进行{n}种不同的同义替换，要求表达方式多样，语义保持不变。请用换行分隔每一种改写。
        示例：
        替换前：请将下面这句话翻译为英文：
        替换后：请将下面这句话转换为英文：
    """
    return llm.prompt(ChatPrompter(prompt))


def paraphrase_n(text: str, n: int = 2) -> list[str]:
    """获取 N 种改写"""
    try:
        paraphraser = make_paraphraser(n)
        result = paraphraser(text)
        candidates = [line.strip() for line in result.split("\n") if line.strip()]
        # 保证至少返回原始 + n 个不同版本（去重）
        unique = list({text.strip()} | set(candidates))
        return unique[: n + 1]
    except Exception as e:
        print(f"[同义替换失败] {e}")
        return [text]


def synonym_augment(sample: dict, n: int = 2) -> list[dict]:
    """基于同义替换增强一条 Alpaca 格式数据，返回原始+增强样本（≥N条）"""
    if not is_valid_sample(sample):
        return []

    # 获取 instruction / input / output 的多个版本
    instr_variants = paraphrase_n(sample.get("instruction", ""), n)
    input_variants = paraphrase_n(sample.get("input", ""), n)
    output_variants = paraphrase_n(sample.get("output", ""), n)

    # 所有组合（instruction × input × output）
    combinations = list(
        itertools.product(instr_variants, input_variants, output_variants)
    )

    # 构造样本列表，去重
    results = [sample]
    seen = set(tuple(sample.values()))
    for instr, inp, out in combinations:
        sample_variant = {"instruction": instr, "input": inp, "output": out}
        # 使用三元组 hash 去重
        sig = (instr, inp, out)
        if sig not in seen:
            seen.add(sig)
            results.append(sample_variant)

    return results[: n + 1]


if __name__ == "__main__":
    sample = {
        "instruction": "翻译：",
        "input": "我很喜欢编程，你呢？",
        "output": "I like programming.",
    }

    augmented = synonym_augment(sample, n=2)

    print("增强样本如下：")
    for i, item in enumerate(augmented, 1):
        print(f"\n样本 {i}:")
        print(item)
