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
内置通用数据集定义模块。

本模块定义了多个常用的中文微调数据集，供模型训练和评测使用。
每个数据集包含名称、文件、描述、上传类型、数据类型、数据格式、来源类型和标签等信息。
"""
# 内置微调数据集
BUILTIN_COMMON_DATASETS = [
    {
        "name": "CMRC2018",
        "file": "train_data_for_cmrc2018.json",
        "description": "CMRC 2018 是一个基于中文维基百科构建的篇章片段抽取式阅读理解数据集，由近20,000个由人类专家注释的真实问题组成。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本问答"],
    },
    {
        "name": "alpaca-zh",
        "file": "train_data_for_alpaca_gpt4_data_zh.json",
        "description": "包含由 GPT-4 生成的指令执行数据，其中 Alpaca 提示由 ChatGPT 翻译成中文。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本生成"],
    },
    {
        "name": "train_0.5M_CN",
        "file": "train_data_for_Belle_open_source_0.5M.json",
        "description": "train_0.5M_CN 是由 BELLE 项目发布的中文指令微调数据集，包含约 50 万条由模型生成的指令-响应对，涵盖多轮对话、数学推理、角色扮演等任务。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本生成"],
    },
    {
        "name": "zh_cls_fudan-news",
        "file": "train_data_for_zh_cls_fudan-news.json",
        "description": "zh_cls_fudan-news 是一个中文新闻文本分类数据集，每条数据包含新闻文本、候选类别列表和真实类别标签。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本分类"],
    },
    {
        "name": "Human-Like-DPO-Dataset",
        "file": "train_data_for_human_like_dpo.json",
        "description": "Human-Like-DPO-Dataset是一个用于 DPO 训练的大语言模型对话数据集，覆盖了256个主题的类人对话样本，旨在提升模型生成的自然性、流畅性与情感参与度，减少机械化响应。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["人类偏好对齐"],
    },
    {
        "name": "fin_exam",
        "file": "train_data_for_fin_exam.json",
        "description": "fin_exam.jsonl 文件是一个中文金融考试题库，旨在评估和提升大型语言模型在金融领域的理解与推理能力。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["单项选择"],
    },
    {
        "name": "DISC-Law-SFT-Triplet",
        "file": "train_data_for_DISC-Law-SFT-Triplet.json",
        "description": "该数据集涵盖法律信息抽取、法律判决预测、法律文件摘要和法律问答等不同的法律场景，有助于增强模型利用外部法律知识的能力。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本问答"],
    },
    {
        "name": "Simplified_Chinese_Multi-Emotion_Dialogue_Dataset",
        "file": "train_data_for_zh_Multi-Emotion_Dialogue.json",
        "description": "本数据是简体中文口语情感分类数据集，使用Qwen2.5-32B-instruce模型将其从繁体中文翻译为简体中文，共4159条",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["文本分类"],
    },
    {
        "name": "CDC_AI-Lab_Text2SQL_CN_180K",
        "file": "train_data_for_cn_text2sql.json",
        "description": (
            "该数据集包含了 186,663 条中文环境下的 Query-Schema-SQL 对，"
            "主要服务于基于 LLM 的 SFT NL2SQL 模型的训练与微调，"
            "旨在训练和测试模型从自然语言到 SQL 的转换能力。"
        ),
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["Text2SQL"],
    },
    {
        "name": "WMT-English-to-Chinese-Machine-Translation-Medical",
        "file": "train_data_for_wmt_en2zh_machine.json",
        "description": "该数据集来源于世界翻译大会WMT 2019 Biomedical Translation Task，聚焦于生物医药领域的英中翻译文本。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["翻译"],
    },
    {
        "name": "Grade School Math 8K",
        "file": "train_data_for_gsm8k.json",
        "description": (
            "该数据集由 OpenAI 团队构建，是一个用于数学问题求解的文本数据集，"
            "其中包含了8000多个小学数学水平的问题（训练集：7473题，测试集：1319题）。"
            "当前数据集中仅包含训练集，这些问题主要涉及基本的算术运算，"
            "如加法、减法、乘法和除法，以及一些简单的数学应用题。"
            "每个问题都附有自然语言形式的答案，这些答案不仅提供了最终的结果，"
            "还详细解释了解题的步骤和过程。"
        ),
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["数学"],
    },
    {
        "name": "School Math 0.25M",
        "file": "train_data_for_school_math_025m.json",
        "description": "此数据集是由ChatGPT产生的，中文语言，包含约25万条由BELLE项目生成的中文数学题数据，包含解题过程。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["数学"],
    },
    {
        "name": " Human Annotated Reasoning Problems ",
        "file": "train_data_for_harp_math.json",
        "description": (
            "HARD-Math是一个数学推理数据集，包含4,780个来自美国国家数学竞赛的简答题，"
            "时间跨度从1950年到2024年9月。数据集包括多个版本，"
            "如默认版本、多选题版本、基于证明的问题版本和原始版本。"
            "每个问题包含问题文本、正确答案、人类编写的解决方案、"
            "年份、竞赛名称、问题编号、难度级别和学科标签。"
        ),
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["数学"],
    },
    {
        "name": "DeepScaleR-Preview-Dataset",
        "file": "train_data_for_deepscaler_preview.json",
        "description": (
            "该数据集是一个包含大约40,000个唯一数学问题-答案对的数据集，"
            "这些问题-答案对来源于AIME、AMC、Omni-MATH和Still数据集。"
            "数据以JSON格式存储，每个条目都包含使用LaTeX格式的问题文本、"
            "官方解决方案和答案。"
        ),
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["数学"],
    },
    {
        "name": "math_dataset_standardized_cluster_0_alpaca",
        "file": "train_data_for_math_standardized_cluster.parquet",
        "description": "该数据集是一个专为训练大型语言模型在数学推理和解题方面能力而设计的数据集，从 OpenAI 的 math_dataset 中提取",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["数学"],
    },
    {
        "name": "CodeExercise-Python-27k",
        "file": "train_data_for_code_exercise_python_27k.json",
        "description": "此数据集包含2.7万个Python编程练习题（英文），涵盖了从基础语法与数据结构、算法应用、数据库查询到机器学习等数百个Python相关主题。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["代码"],
    },
    {
        "name": "code-debug",
        "file": "train_data_for_code_debug.json",
        "description": "code-debug 是一个用于代码调试任务的数据集，该数据集旨在支持代码错误检测与修复模型的训练和评估，特别适用于代码调试、错误定位和自动修复等场景。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["代码"],
    },
    {
        "name": "CodeAlpaca-20k",
        "file": "train_data_for_code_alpace_20k.json",
        "description": "CodeAlpaca是一组包含20,000个指令-输入-代码三元组的数据集，与Alpaca数据集一样，它们是由闭源语言模型生成的。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["代码"],
    },
    {
        "name": "python_code_instructions_18k_alpaca",
        "file": "train_data_for_python_code_18k.parquet",
        "description": "包含约 18,612 条 Python 编程任务的指令微调数据集，采用 Alpaca 风格的格式，旨在支持大型语言模型（LLM）在代码生成和理解方面的训练。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["代码"],
    },
    {
        "name": "CodeAlpaca-20k_standardized",
        "file": "train_data_for_code_standardized.parquet",
        "description": "该数据集涵盖 Python、Java、C++、JavaScript、SQL 等多种编程语言，用于多语言代码生成、指令微调、代码理解与生成。",
        "upload_type": "local",
        "data_type": "doc",
        "data_format": "Alpaca_fine_tuning",
        "from_type": "upload",
        "tag_names": ["代码"],
    },
]
