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

"""
数据增强 —— 回译增强：
- 利用回译技术提升输出语句的多样性
- 将 output 字段翻译为英文再翻译回中文，生成语义相同但表述不同的新样本
- 保持 instruction / input 不变，仅增强 output，适合用于提升生成式模型泛化能力
"""


from lazyllm import ChatPrompter, OnlineChatModule

# 初始化中英互译翻译器
tr_prompt = "请将所给内容翻译。如果是中文就翻译成英文，如果是英文就翻译成中文。"
llm = OnlineChatModule().prompt(ChatPrompter(tr_prompt))


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


def back_translate(text: str) -> str:
    """对中文文本进行中→英→中回译，增强多样性"""
    try:
        en_text = llm(text)
        zh_text = llm(en_text)
        return zh_text
    except Exception as e:
        print(f"回译失败：{e}")
        return text


def backtranslation_augment(sample: dict[str, str], n: int = 2) -> list[dict[str, str]]:
    """返回原样本 + n条回译增强样本"""
    if not is_valid_sample(sample):
        return []

    output = sample["output"].strip()
    augmented_samples = [sample]
    seen_outputs = {output}

    for _ in range(n * 2):  # 最多尝试2n次避免重复
        new_output = back_translate(output)
        if new_output and new_output != output and new_output not in seen_outputs:
            seen_outputs.add(new_output)
            augmented_samples.append(
                {
                    "instruction": sample.get("instruction", ""),
                    "input": sample.get("input", ""),
                    "output": new_output,
                }
            )
        if len(augmented_samples) >= n + 1:
            break

    return augmented_samples


if __name__ == "__main__":
    sample = {
        "instruction": "请用中文总结以下内容：",
        "input": (
            "Artificial Intelligence (AI) is transforming industries by automating tasks, "
            "improving efficiency, and enabling new capabilities across various sectors "
            "including healthcare, finance, and education."
        ),
        "output": "人工智能正在通过自动化任务、提高效率和赋能新能力，改变包括医疗、金融和教育等多个行业。",
    }

    results = backtranslation_augment(sample, n=2)

    print("增强后数据：")
    for i, item in enumerate(results, 1):
        print(f"\n样本 {i}:")
        print(item)
