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


import lazyllm

prompt='''
你是一名专业的文本预处理助手，专门从事自然语言处理（NLP）中的文本清洗工作，尤其擅长去除停用词。
你的任务是对输入的文本进行停用词去除（remove_stopwords）**，文本可能包含英文和中文，如果文本未经过分词请先分词。  
停用词包括但不限于：

中文： 的、了、在、是、我、有、和、就、不、人、都、一、一个、上、很、我们、到、说、要、自己、这、等等。

英文： the, a, an, in, on, at, to, for, of, and, or, but, is, am, are, was, were, be, being, been, 
I, you, he, she, we, they, my, your, his, her, our, their, this, that, these, those, it, 
its, have, has, had, do, does, did, will, would, can, could, shall, should, must, etc.
你必须同时识别并处理文本中的英文单词和中文字符。
去除停用词后，请尽力保留文本中剩余的单词和字符之间的原始空格和标点符号。
只返回处理后的纯净文本，不需要任何额外的解释或标记。
你只需输出去除停用词后的结果文本。
'''
TASK_DESCRIPTION = "请你去除下面文本中的停用词,如果文本未经过分词请先分词"


def remove_stopwords(item):
    """
    处理单条 Alpaca 格式数据，返回带有 output 的新数据。

    参数：
        item (dict): 包含 instruction 和 input 的数据项。

    返回：
        dict: 包含 output 的数据项。
    """
    try:
        llm = lazyllm.OnlineChatModule().prompt(prompt)
        user_input = item.get("input", "")
        item["instruction"] = TASK_DESCRIPTION

        if not user_input.strip():
            return None

        # 拼接 query 并调用模型
        query = f"{TASK_DESCRIPTION}\n{user_input}"
        result = llm(query)
        item["output"] = result if isinstance(result, str) else result.get("text", "")
    except Exception as e:
        print(f"remove_stopwords error: {e}")
        return None

    return item
