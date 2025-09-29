# Data Processor

**Data Processor** 是一个用于自然语言处理任务前处理和标注的模块化工具包。该项目支持数据增强、数据过滤、数据去噪、以及多种类型的数据标注功能，适用于构建高质量训练集或预处理文本数据。

---

## 模块结构

data_processor/  
├── data_augmentation/ # 数据增强（5种策略）  
├── data_filtering/ # 数据过滤（如长度过滤、敏感词过滤等）  
├── data_denoising/ # 数据去噪（清洗特殊符号、多余空格等）  
├── data_labeling/ # 数据标注（8种标注任务）



---

## 功能一览

### data_augmentation

**数据增强**：扩充原始数据集规模，通过数据回流或某种规则生成，自动生成新的文本数据，补充真实样本的不足。

- `alpaca_synonym_augment.py`：同义词替换
- `alpaca_template_augment.py`：任务模板改写
- `alpaca_typo_augment.py`：模拟用户噪声
- `alpaca_backtranslation_augment.py`：回译增强
- `alpaca_semantic_augment.py`：语序改写

### data_filtering

**数据过滤**：筛除不符合结构规范、标签缺失或与任务无关的样本，如缺少instruction字段、output为空的数据；并对过长内容进行截断，确保数据结构完整、长度合理。

- `alpaca_data_filter.py`：数据过滤

### data_denoising

**数据去噪**：移除或修正文本数据中的错字、乱码、重复内容、无意义符号、低质量表达等干扰项，以提高数据质量。

- `alpaca_noise_cleaner.py`：清除重复字符、无效标点等噪声

### data_labeling

**数据标注**：对原始文本进行语义层级的清洗与加工，为文本数据添加明确的元信息，包括实体标注、语义角色和关系标注、词性和句法标注、翻译标注、摘要标注、问答标注。

- `alpaca_entity_recognition.py`：实体识别
- `alpaca_semantic_role_labeling.py`：语义角色标注
- `alpaca_relation_extraction.py`：实体关系抽取
- `alpaca_part_of_speech.py`：词性标注
- `alpaca_syntactic_parsing.py`：句法分析
- `alpaca_annotate_translate.py`：翻译标注
- `alpaca_annotate_summarization.py`：摘要生成
- `alpaca_question_answering.py`：问答对生成


