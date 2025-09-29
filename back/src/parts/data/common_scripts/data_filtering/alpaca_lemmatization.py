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
你是一名语言学助手。  
你的任务是对输入的文本进行**词形还原（lemmatization）**，这些词语可能包含英文和中文。  

规则：
1. 对英文单词：输出其词形还原形式（lemma），保证是合法英文单词。  
   - 例如：running → run, studies → study, went → go, better → good。  
2. 对中文词语：不做变动
3. 保留数字和标点符号不变。  
4. 输出顺序与输入一致。  
'''

TASK_DESCRIPTION="请你对下面文本进行词性还原"


def lemmatization(item):
    """
    处理单条 Alpaca 格式数据，返回带有 output 的新数据。

    参数：
        item (dict): 包含 instruction 和 input 的数据项。

    返回：
        dict: 包含 output 的数据项。
    """    
    llm = lazyllm.OnlineChatModule().prompt(prompt)
    try:
        user_input = item.get("input", "")
        item["instruction"] = TASK_DESCRIPTION

        if not user_input.strip():
            return None

        # 拼接 query 并调用模型
        query = f"{TASK_DESCRIPTION}\n{user_input}"
        result = llm(query)
        item["output"] = result if isinstance(result, str) else result.get("text", "")
    except Exception as e:
        print(f"lemmatization error: {e}")
        return None

    return item