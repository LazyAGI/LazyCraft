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

"""数据增强 - 模拟用户噪声：
- 人为引入拼写错误、口语化表达、重复字词等模拟用户噪声
- 训练模型具备一定容错能力
"""

import copy
import random


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


def introduce_typos(text: str, typo_prob: float = 0.1) -> str:
    """引入拼写错误噪声，随机删除、替换或交换字符
    返回拼写错误后的文本
    """
    chars = list(text)
    i = 0
    while i < len(chars):
        if random.random() < typo_prob:
            typo_type = random.choice(["delete", "replace", "swap"])
            if typo_type == "delete" and len(chars) > 1:
                chars.pop(i)
                continue
            elif typo_type == "replace":
                chars[i] = random.choice("abcdefghijklmnopqrstuvwxyz")
            elif typo_type == "swap" and i < len(chars) - 1:
                chars[i], chars[i + 1] = chars[i + 1], chars[i]
                i += 1
        i += 1
    return "".join(chars)


def introduce_repetition(text: str, rep_prob: float = 0.1) -> str:
    """随机重复词语，模拟口语化重复现象
    返回添加重复词的文本
    """
    words = text.split()
    new_words = []
    for w in words:
        new_words.append(w)
        if random.random() < rep_prob:
            new_words.append(w)
    return " ".join(new_words)


def introduce_slang(text: str, slang_dict=None, slang_prob: float = 0.1) -> str:
    """随机用口语化表达替换标准词汇，模拟用户常见用语
    返回替换后文本
    """
    if slang_dict is None:
        slang_dict = {
            "你好": "嗨",
            "谢谢": "多谢",
            "请": "拜托",
            "不要": "别",
            "怎么样": "咋样",
            "知道": "晓得",
            "非常": "特別",
            "真的": "真心",
        }
    words = text.split()
    new_words = []
    for w in words:
        if w in slang_dict and random.random() < slang_prob:
            new_words.append(slang_dict[w])
        else:
            new_words.append(w)
    return " ".join(new_words)


def noise_augment(sample: dict, typo_prob=0.1, rep_prob=0.1, slang_prob=0.1) -> dict:
    """对 Alpaca 格式数据的 instruction/input/output 字段加入噪声增强
    返回一条噪声增强样本
    """
    noisy_sample = copy.deepcopy(sample)
    for key in ["instruction", "input", "output"]:
        if key in noisy_sample and noisy_sample[key].strip():
            text = noisy_sample[key]
            text = introduce_typos(text, typo_prob)
            text = introduce_repetition(text, rep_prob)
            text = introduce_slang(text, slang_prob=slang_prob)
            noisy_sample[key] = text
    return noisy_sample


def typo_augment(sample: dict, n: int = 2):
    """返回原样本 + n条噪声增强样本"""
    if not is_valid_sample(sample):
        return []

    results = [sample]
    for _ in range(n):
        # 不同随机噪声参数，增加多样性
        augmented = noise_augment(
            sample,
            typo_prob=random.uniform(0.1, 0.3),
            rep_prob=random.uniform(0.1, 0.3),
            slang_prob=random.uniform(0.2, 0.4),
        )
        results.append(augmented)
    return results


if __name__ == "__main__":
    sample = {
        "instruction": "请将下面这句话翻译成英文：",
        "input": "你好，我想了解这个产品的功能。",
        "output": "Hello, I want to understand the features of this product.",
    }

    augmented_samples = typo_augment(sample, n=2)
    print("原始样本 + 噪声增强样本：")
    for i, s in enumerate(augmented_samples, 1):
        print(f"\n样本{i}:")
        print(s)
