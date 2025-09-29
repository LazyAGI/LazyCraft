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

"""数据增强 —— 任务模板改写：
- 根据任务类型，对 instruction 使用多种自然语言模板进行格式化重写
- 增强样本表达方式多样性，适用于 Alpaca 格式数据增强
"""

import random

# === 模板库（可扩展） ===
TASK_TEMPLATES = {
    "translate_zh_en": [
        "请将下列句子翻译成英文：{text}",
        "请将下面这句话译为英文：{text}",
        "把这句话翻成英文：{text}",
        "请翻成英文：{text}",
        "帮我把这句话用英文表达出来：{text}",
    ],
    "translate_en_zh": [
        "请将下列句子翻译成中文：{text}",
        "请将下面这句话译成中文：{text}",
        "把这句话翻成中文：{text}",
        "请翻成中文：{text}",
        "帮我把这句话用中文表达出来：{text}",
    ],
    "paraphrase": [
        "请改写以下句子，使其意思不变但表达不同：{text}",
        "请用不同方式重新表达这句话：{text}",
        "换一种说法表达：{text}",
        "请进行同义句改写：{text}",
    ],
    "summarize": [
        "请对以下内容进行摘要：{text}",
        "请总结这段话的主要内容：{text}",
        "简要概括以下文字：{text}",
    ],
}


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


def detect_task_type(instruction: str) -> str:
    """根据 instruction 粗略判断任务类型"""
    if "翻译成英文" in instruction or "译为英文" in instruction:
        return "translate_zh_en"
    elif "翻译成中文" in instruction or "译为中文" in instruction:
        return "translate_en_zh"
    elif "改写" in instruction or "同义" in instruction:
        return "paraphrase"
    elif "摘要" in instruction or "总结" in instruction:
        return "summarize"
    else:
        return ""  # 返回空表示无法识别任务类型


def template_augment(sample: dict[str, str], n: int = 3) -> list[dict[str, str]]:
    """对 instruction/input 进行模板改写增强"""
    if not is_valid_sample(sample):
        return []

    results = [sample]  # 包含原样本

    task_type = detect_task_type(sample.get("instruction", ""))
    if not task_type:
        return results

    templates = TASK_TEMPLATES.get(task_type, [])
    input_text = sample.get("input", "").strip()

    seen = set()
    seen.add((sample["instruction"], input_text))

    for template in random.sample(templates, min(n, len(templates))):
        new_instruction = template.format(text=input_text)
        variant = {
            "instruction": new_instruction,
            "input": "",
            "output": sample.get("output", ""),
        }
        sig = (new_instruction, input_text)
        if sig not in seen:
            seen.add(sig)
            results.append(variant)

    return results


if __name__ == "__main__":
    sample = {
        "instruction": "请将下列句子翻译成英文：",
        "input": "我喜欢自然语言处理。",
        "output": "I like natural language processing.",
    }

    augmented = template_augment(sample, n=3)
    print("增强样本如下：")
    for i, item in enumerate(augmented, 1):
        print(f"\n样本 {i}:")
        print(item)
