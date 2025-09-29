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
内置常用脚本定义模块。

本模块定义了多种常用的数据处理、增强、去噪和标注脚本，供数据预处理和模型训练使用。
每个脚本包含名称、描述、脚本类型、数据类型、输入类型、脚本路径和图标等信息。
"""
"""
内置常用脚本
script_type:
    数据过滤
    数据增强
    数据去噪
    数据标注
data_type:
    文本类
input_type:
    local 本地上传
    url 远程下载
"""

BUILTIN_COMMON_SCRIPTS = [
    {
        "name": "数据过滤",
        "description": "筛除不符合结构规范、标签缺失或与任务无关的样本，如缺少instruction字段、output为空的数据，并对过长内容进行截断，确保数据结构完整、长度合理",
        "script_type": "数据过滤",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_filtering/alpaca_data_filter.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "回译增强",
        "description": (
            "利用回译技术提升输出语句的多样性，将 output 字段翻译为英文再翻译回中文，"
            "生成语义相同但表述不同的新样本，保持 instruction / input 不变，"
            "仅增强 output，适合用于提升生成式模型泛化能力"
        ),
        "script_type": "数据增强",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_augmentation/alpaca_backtranslation_augment.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "语序改写",
        "description": "对 input/output 字段做语序调整，保证语义不变，利用 LLM 重写语句，增加句式灵活性，提升 Alpaca 格式模型对语法变化的鲁棒性",
        "script_type": "数据增强",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_augmentation/alpaca_semantic_augment.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "同义词替换",
        "description": "对 instruction/input/output 字段进行 LLM 同义改写，保证语义不变，表述方式多样，适用于 Alpaca 格式数据增强，提升模型鲁棒性",
        "script_type": "数据增强",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_augmentation/alpaca_synonym_augment.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "任务模板改写",
        "description": "根据任务类型，对 instruction 使用多种自然语言模板进行格式化重写，增强样本表达方式多样性，适用于 Alpaca 格式数据增强",
        "script_type": "数据增强",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_augmentation/alpaca_template_augment.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "模拟用户噪声",
        "description": "人为引入拼写错误、口语化表达、重复字词等模拟用户噪声，训练模型具备一定容错能力",
        "script_type": "数据增强",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_augmentation/alpaca_typo_augment.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "数据去噪",
        "description": "移除或修正文本数据中的错字、乱码、重复内容、无意义符号、低质量表达等干扰项，提高 instruction / input / output 字段的语义清晰度和可用性，增强数据质量",
        "script_type": "数据去噪",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_denoising/alpaca_noise_cleaner.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "实体标注",
        "description": "对输入文本中的实体进行识别，并标注其类别（如人名、地名、组织等），输出结构化结果",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_entity_recognition.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "词性标注",
        "description": "对输入文本执行词性标注任务，识别每个词的语法属性（如名词、动词、形容词等），并生成对应的结构化输出",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_part_of_speech.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "问答标注",
        "description": "对输入数据中的上下文与问题进行理解与推理，自动生成语义准确、逻辑连贯的自然语言回答",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_question_answering.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "关系标注",
        "description": "对输入文本执行关系抽取任务，识别文本中实体之间的语义关系并标注其类型，输出结构化结果",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_relation_extraction.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "语义角色标注",
        "description": "执行语义角色标注任务，识别文本中的谓词及其对应的论元结构，标注各成分在句中所承担的语义角色（如施事、受事、工具等），生成结构化标注结果",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_semantic_role_labeling.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "摘要标注",
        "description": "对输入文本执行自动摘要任务，提取关键信息并生成内容简洁、结构清晰的摘要文本，适用于文本压缩与信息提炼类应用场景",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_annotate_summarization.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "句法标注",
        "description": "对输入文本执行句法分析任务，生成对应的依存结构或短语结构表示，揭示句子内部的层级关系与成分依赖，适用于句法理解与结构化语言处理场景",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_syntactic_parsing.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "翻译标注",
        "description": "对输入中文文本执行英译任务，生成语义准确、表达自然的英文翻译结果，适用于构建翻译类数据集或增强跨语言处理能力",
        "script_type": "数据标注",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_labeling/alpaca_annotate_translate.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "词形还原",
        "description": "根据词典和词性信息将单词还原为词典中的标准形式（lemma），从而把不同的词形变化统一成同一个基本词，比如 went → go、studies → study。",
        "script_type": "数据过滤",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_filtering/alpaca_lemmatization.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "停用词去除",
        "description": "通过过滤掉在语义分析中贡献较小的高频词（如英文的 a, the, is，中文的“的、了、在”），从而减少噪音、降低维度，使后续的分词、向量化和建模更专注于真正有意义的内容。",
        "script_type": "数据过滤",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_filtering/alpaca_remove_stopwords.py",
        "icon": "/app/upload/script.jpg",
    },
    {
        "name": "词干提取",
        "description": "通过基于规则或启发式的方法将单词截断到词干形式把不同形态的词汇归并在一起，例如 studies → studi、running → run，以便在文本检索和统计建模中减少特征维度",
        "script_type": "数据过滤",
        "data_type": "文本类",
        "input_type": "local",
        "script": "data_filtering/alpaca_stemming.py",
        "icon": "/app/upload/script.jpg",
    },    
]
