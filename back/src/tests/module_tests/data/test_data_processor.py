import pytest

from parts.data.common_scripts.data_augmentation.alpaca_backtranslation_augment import \
    backtranslation_augment
from parts.data.common_scripts.data_augmentation.alpaca_semantic_augment import \
    semantic_augment
from parts.data.common_scripts.data_augmentation.alpaca_synonym_augment import \
    synonym_augment
from parts.data.common_scripts.data_augmentation.alpaca_template_augment import \
    template_augment
from parts.data.common_scripts.data_augmentation.alpaca_typo_augment import \
    typo_augment
from parts.data.common_scripts.data_denoising.alpaca_noise_cleaner import \
    noise_cleaner
from parts.data.common_scripts.data_filtering.alpaca_data_filter import \
    data_filter
from parts.data.common_scripts.data_labeling.alpaca_annotate_summarization import \
    annotate_summarization
from parts.data.common_scripts.data_labeling.alpaca_annotate_translate import \
    annotate_translate
from parts.data.common_scripts.data_labeling.alpaca_entity_recognition import \
    entity_recognition
from parts.data.common_scripts.data_labeling.alpaca_part_of_speech import \
    part_of_speech
from parts.data.common_scripts.data_labeling.alpaca_question_answering import \
    question_answering
from parts.data.common_scripts.data_labeling.alpaca_relation_extraction import \
    relation_extraction
from parts.data.common_scripts.data_labeling.alpaca_semantic_role_labeling import \
    semantic_role_labeling
from parts.data.common_scripts.data_labeling.alpaca_syntactic_parsing import \
    syntactic_parsing


class TestDataProcessor:
    def setup_method(self):
        # 通用的 Alpaca 格式样本
        self.valid_sample = {
            "instruction": "请将下面这句话翻译成英文：",
            "input": "我喜欢自然语言处理。",
            "output": "I like natural language processing.",
        }
        self.invalid_sample = {"instruction": "请将下面这句话翻译成英文："}
        self.sample_den = {
            "instruction": "请翻译下列句子！！！ 啊啊啊啦啦啦 <br> 妳好~\n",
            "input": "你好!这是一个测试测试，今天我去了洒店。☃☃☃",
            "output": "你好，世界！！！ 人名币很好用。",
        }
        self.sample_lab = {
            "instruction": "请对下面的句子进行命名实体识别。",
            "input": "比尔·盖茨是微软公司的创始人之一。",
            "output": "比尔·盖茨 [人物] 是 微软公司 [组织] 的创始人之一。",
        }

    @pytest.mark.parametrize(
        "augment_func",
        [
            synonym_augment,
            template_augment,
            typo_augment,
            backtranslation_augment,
            semantic_augment,
        ],
    )
    def test_augment_func(self, augment_func):
        """测试所有增强函数是否返回 list[dict] or []，不为空时字段完整"""
        result = augment_func(self.invalid_sample)
        assert isinstance(result, list)
        assert result == []

        result = augment_func(self.valid_sample)
        assert isinstance(result, list)
        assert len(result) >= 1
        for item in result:
            assert isinstance(item, dict)
            assert "instruction" in item and isinstance(item["instruction"], str)
            assert "input" in item and isinstance(item["input"], str)
            assert "output" in item and isinstance(item["output"], str)

    @pytest.mark.parametrize("filter_func", [data_filter])
    def test_filter_func(self, filter_func):
        """测试所有过滤函数是否返回 dict or None，不为空时字段完整"""
        result = filter_func(self.invalid_sample)
        assert result is None

        result = filter_func(self.valid_sample)
        assert isinstance(result, dict)
        assert "instruction" in result and isinstance(result["instruction"], str)
        assert "input" in result and isinstance(result["input"], str)
        assert "output" in result and isinstance(result["output"], str)

    @pytest.mark.parametrize("denoise_func", [noise_cleaner])
    def test_denoise_func(self, denoise_func):
        """测试所有去噪函数是否返回 dict or None，不为空时字段完整"""
        result = denoise_func(self.invalid_sample)
        assert result is None

        result = denoise_func(self.sample_den)
        assert isinstance(result, dict)
        assert "instruction" in result and isinstance(result["instruction"], str)
        assert "input" in result and isinstance(result["input"], str)
        assert "output" in result and isinstance(result["output"], str)

    @pytest.mark.parametrize(
        "label_func",
        [
            annotate_translate,
            entity_recognition,
            semantic_role_labeling,
            relation_extraction,
            part_of_speech,
            syntactic_parsing,
            annotate_summarization,
            question_answering,
        ],
    )
    def test_label_func(self, label_func):
        """测试所有标注函数是否返回 dict or None，不为空时字段完整"""
        result = label_func(self.invalid_sample)
        assert result is None

        result = label_func(self.sample_lab)
        assert isinstance(result, dict)
        assert "instruction" in result and isinstance(result["instruction"], str)
        assert "input" in result and isinstance(result["input"], str)
        assert "output" in result and isinstance(result["output"], str)
