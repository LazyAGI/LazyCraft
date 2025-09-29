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

"""数据去噪：
- 移除或修正文本数据中的错字、乱码、重复内容、无意义符号、低质量表达等干扰项
- 提高 instruction / input / output 字段的语义清晰度和可用性，增强数据质量
"""

import re
import unicodedata

# from pycorrector import Corrector


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


def remove_redundant_words(text: str) -> str:
    """移除重复词组和字符"""
    # 连续重复的中文词（贪婪匹配：如 测试测试 → 测试）
    text = re.sub(r"(\w{2,10})\1+", r"\1", text)  # 2~10 字的词重复
    # 连续重复的单个汉字（好好好 → 好）
    text = re.sub(r"([\u4e00-\u9fa5])\1{1,}", r"\1", text)
    return text


def remove_duplicate_phrases(text: str) -> str:
    """通过滑动窗口移除连续重复词语（简单模拟）"""
    for window in range(2, 6):  # 尝试2~5字符长度
        pattern = rf"((.{{{window}}}))\1+"
        text = re.sub(pattern, r"\1", text)
    return text


def clean_text(text: str) -> str:
    """文本清洗逻辑：去除乱码、重复字符、奇怪符号、统一空格"""
    if not isinstance(text, str):
        return ""

    # 转换全角为半角
    text = unicodedata.normalize("NFKC", text)

    # 去除不可见字符和控制字符
    text = "".join(ch for ch in text if ch.isprintable())

    # 去除 HTML 标签
    text = re.sub(r"<[^>]+>", "", text)

    # 去除特殊无意义字符（保留中英文、常用标点）
    text = re.sub(r"[^\w\s\u4e00-\u9fff,.!?;:，。！？；：\-\'\"()（）【】]", "", text)

    # 合并重复标点符号，如“！！！ → ！”
    text = re.sub(r"([!?。，；：]{1})\1+", r"\1", text)

    # 去除重复空格
    text = re.sub(r"\s+", " ", text).strip()

    # 修正错字
    # text, _ = Corrector(text)

    # 去除重复内容（字符 + 词组）
    text = remove_redundant_words(text)
    text = remove_duplicate_phrases(text)

    return text


def noise_cleaner(sample: dict) -> dict:
    """对字典中的 instruction / input / output 字段进行去噪清洗"""
    if not is_valid_sample(sample):
        return None

    return {
        "instruction": clean_text(sample.get("instruction", "")),
        "input": clean_text(sample.get("input", "")),
        "output": clean_text(sample.get("output", "")),
    }


if __name__ == "__main__":
    sample = {
        "instruction": "请翻译下列句子！！！ 啊啊啊啦啦啦 <br> 妳好~\n",
        "input": "你好!这是一个测试测试，今天我去了洒店。☃☃☃",
        "output": "你好，世界！！！ 人名币很好用。",
    }

    result = noise_cleaner(sample)

    print("去噪后数据：")
    print(result)
