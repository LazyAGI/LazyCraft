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

"""数据过滤：
- 筛除不符合结构规范、标签缺失或与任务无关的样本，如缺少instruction字段、output为空的数据
- 并对过长内容进行截断，确保数据结构完整、长度合理。
"""

MAX_INSTRUCTION_LEN = 512
MAX_INPUT_LEN = 1024
MAX_OUTPUT_LEN = 1024


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


def truncate(text: str, max_len: int) -> str:
    """对文本进行截断"""
    return text[:max_len] if isinstance(text, str) else ""


def data_filter(sample: dict) -> dict:
    """处理样本，返回过滤后的样本字典；如果无效则返回 None"""
    if not is_valid_sample(sample):
        return None

    return {
        "instruction": truncate(sample.get("instruction", ""), MAX_INSTRUCTION_LEN),
        "input": truncate(sample.get("input", ""), MAX_INPUT_LEN),
        "output": truncate(sample.get("output", ""), MAX_OUTPUT_LEN),
    }


if __name__ == "__main__":
    sample = {
        "instruction": "请对下列句子进行翻译：",
        "input": "Hello, world!",
        "output": "",
    }

    result = data_filter(sample)

    if result is not None:
        print("有效数据，处理结果：")
        print(result)
    else:
        print("无效数据，被过滤。")
