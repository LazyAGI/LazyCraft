# Copyright (c) 2025 SenseTime. All Rights Reserved.
# Author: LazyLLM Team,  https://github.com/LazyAGI/LazyLLM
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

firms = {
    "SenseNova": ["llm", "embedding"],
    "Deepseek": ["llm"],
    "Qwen": ["llm", "embedding", "reranker"],
    "GLM": ["llm", "embedding", "reranker"],
    "Doubao": ["llm", "embedding"],
    "Kimi": ["llm"],
    "OpenAI": ["llm", "embedding"],
    "SiliconFlow": ["llm", "embedding", "reranker", "sd", "tts", "stt", "vqa"],
    "AIPing": ["llm", "embedding", "reranker", "vqa", "sd"],
}

# 模型类别
model_kinds = {
    "localLLM": "大模型",
    "OnlineLLM": "大模型",
    "Embedding": "向量模型",
    "reranker": "重排序",
    "VQA": "视觉问答",
    "SD": "文生图",
    "TTS": "文字转语音",
    "STT": "语音转文字",
}
# 模型仓库卡片类别
model_card_kinds = {
    "localLLM": "大模型（localLLM）",
    "OnlineLLM": "大模型（OnlineLLM）",
    "Embedding": "向量模型（Embedding）",
    "reranker": "重排序（Reranker）",
    "VQA": "视觉问答（VQA）",
    "SD": "文生图（SD）",
    "TTS": "文字转语音（TTS）",
    "STT": "语音转文字（STT）",
}

online_model_list = {
    "SenseNova": {
        "llm_list": [
            {"model_name": "SenseChat-5", "support_finetune": False, "type": "LLM"},
            {"model_name": "SenseChat", "support_finetune": False, "type": "LLM"},
            {"model_name": "SenseChat-32K", "support_finetune": False, "type": "LLM"},
            {"model_name": "SenseChat-128K", "support_finetune": False, "type": "LLM"},
            {"model_name": "SenseChat-Turbo", "support_finetune": False, "type": "LLM"},
        ],
        "embedding_list": [
            {
                "model_name": "nova-embedding-stable",
                "support_finetune": False,
                "type": "embedding",
            }
        ],
        "vqa_list": [
            {"model_name": "SenseNova-V6-5-Pro", "support_finetune": False, "type": "VQA"},
            {"model_name": "SenseNova-V6-5-Turbo", "support_finetune": False, "type": "VQA"},
            {"model_name": "SenseNova-V6-Turbo", "support_finetune": False, "type": "VQA"},
            {"model_name": "SenseNova-V6-Pro", "support_finetune": False, "type": "VQA"}
        ],
    },
    "Deepseek": {
        "llm_list": [
            {"model_name": "deepseek-chat", "support_finetune": False, "type": "LLM"}
        ]
    },
    "Qwen": {
        "reranker_list": [
            {"model_name": "gte-rerank", "support_finetune": False, "type": "rerank"},
        ],
        "embedding_list": [
            {
                "model_name": "text-embedding-v1",
                "support_finetune": False,
                "type": "embedding",
            },
            {
                "model_name": "text-embedding-v2",
                "support_finetune": False,
                "type": "embedding",
            },
            {
                "model_name": "text-embedding-v3",
                "support_finetune": False,
                "type": "embedding",
            },
        ],
        "llm_list": [
            {"model_name": "qwen-plus", "support_finetune": False, "type": "LLM"},
            {"model_name": "qwen-turbo-0919", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen2.5-0.5b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-1.5b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-3b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-7b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-14b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-32b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2.5-72b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen-turbo-latest",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-plus-0919", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen-plus-latest",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-max-0919", "support_finetune": False, "type": "LLM"},
            {"model_name": "qwen-max-latest", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen2-72b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2-7b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2-0.5b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2-1.5b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen2-57b-a14b-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-long", "support_finetune": False, "type": "LLM"},
            {"model_name": "qwen-max-0428", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen1.5-110b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-7b-chat", "support_finetune": True, "type": "LLM"},
            {
                "model_name": "qwen-1.8b-longcontext-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-1.8b-chat", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen1.5-0.5b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-72b-chat", "support_finetune": True, "type": "LLM"},
            {"model_name": "qwen-14b-chat", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen-max-longcontext",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-max-1201", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "qwen1.5-32b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen1.5-72b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qqwen1.5-7b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen1.5-1.8b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "qwen1.5-14b-chat",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "qwen-max", "support_finetune": False, "type": "LLM"},
            {"model_name": "qwen-turbo", "support_finetune": True, "type": "LLM"},
            {"model_name": "qwen-max-0107", "support_finetune": False, "type": "LLM"},
            {"model_name": "qwen-max-0403", "support_finetune": False, "type": "LLM"},
        ],
        "tts_list": [
            {"model_name": "qwen-tts", "support_finetune": False, "type": "TTS"}
        ],
        "sd_list": [
            {"model_name": "wanx2.1-t2i-turbo", "support_finetune": False, "type": "SD"}
        ],
        "vqa_list": [
            {"model_name": "qwen-vl-plus", "support_finetune": False, "type": "VQA"}
        ],
    },
    "GLM": {
        "embedding_list": [
            {
                "model_name": "embedding-2",
                "support_finetune": False,
                "type": "embedding",
            },
            {
                "model_name": "embedding-3",
                "support_finetune": False,
                "type": "embedding",
            },
        ],
        "llm_list": [
            {"model_name": "glm-4", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-plus", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-0520", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-air", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-long", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-airx", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-flashx", "support_finetune": False, "type": "LLM"},
            {"model_name": "glm-4-flash", "support_finetune": False, "type": "LLM"},
            {"model_name": "chatglm3-6b", "support_finetune": True, "type": "LLM"},
            {"model_name": "chatglm_12b", "support_finetune": True, "type": "LLM"},
            {"model_name": "chatglm_32b", "support_finetune": True, "type": "LLM"},
            {"model_name": "chatglm_66b", "support_finetune": True, "type": "LLM"},
            {"model_name": "chatglm_130b", "support_finetune": True, "type": "LLM"},
        ],
        "reranker_list": [
            {"model_name": "rerank", "support_finetune": True, "type": "rerank"}
        ],
        "stt_list": [
            {"model_name": "glm-asr", "support_finetune": False, "type": "STT"}
        ],
    },
    "Doubao": {
        "llm_list": [
            {
                "model_name": "doubao-1-5-pro-32k-250115",
                "support_finetune": False,
                "type": "LLM",
            }
        ],
        "embedding_list": [
            {
                "model_name": "doubao-embedding-text-240715",
                "support_finetune": False,
                "type": "embedding",
            }
        ],
    },
    "Kimi": {
        "llm_list": [
            {"model_name": "moonshot-v1-8k", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "moonshot-v1-128k",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "moonshot-v1-32kK",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "moonshot-v1-auto",
                "support_finetune": False,
                "type": "LLM",
            },
        ]
    },
    "OpenAI": {
        "embedding_list": [
            {
                "model_name": "text-embedding-ada-002",
                "support_finetune": False,
                "type": "embedding",
            },
            {
                "model_name": "text-embedding-3-large",
                "support_finetune": False,
                "type": "embedding",
            },
            {
                "model_name": "text-embedding-3-small",
                "support_finetune": False,
                "type": "embedding",
            },
        ],
        "llm_list": [
            {"model_name": "gpt-3.5-turbo", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "gpt-3.5-turbo-0125",
                "support_finetune": True,
                "type": "LLM",
            },
            {
                "model_name": "gpt-3.5-turbo-1106",
                "support_finetune": True,
                "type": "LLM",
            },
            {
                "model_name": "gpt-3.5-turbo-instruct",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "gpt-3.5-turbo-instruct-0914",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "gpt-4-1106-preview",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "gpt-4-0125-preview",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "gpt-4-turbo-preview",
                "support_finetune": False,
                "type": "LLM",
            },
            {"model_name": "gpt-4-turbo", "support_finetune": False, "type": "LLM"},
            {
                "model_name": "gpt-4-turbo-2024-04-09",
                "support_finetune": False,
                "type": "LLM",
            },
            {
                "model_name": "gpt-3.5-turbo-0613",
                "support_finetune": True,
                "type": "LLM",
            },
            {"model_name": "babbage-002", "support_finetune": True, "type": "LLM"},
            {"model_name": "davinci-002", "support_finetune": True, "type": "LLM"},
            {"model_name": "gpt-4-0613", "support_finetune": True, "type": "LLM"},
        ],
    },
    "SiliconFlow": {
        "llm_list": [
            {"model_name": "Qwen/QwQ-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen3-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen3-14B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen3-30B-A3B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen3-235B-A22B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-72B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-72B-Instruct-128K", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-32B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-14B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-7B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-Coder-32B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen/Qwen2.5-Coder-7B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-V3", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-V2.5", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-R1", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B", "support_finetune": False, "type": "LLM"},
            {"model_name": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", "support_finetune": False, "type": "LLM"},
            {"model_name": "THUDM/GLM-4.1V-9B-Thinking", "support_finetune": False, "type": "LLM"},
            {"model_name": "zai-org/GLM-4.6", "support_finetune": False, "type": "LLM"},
            {"model_name": "zai-org/GLM-4.5", "support_finetune": False, "type": "LLM"},
            {"model_name": "zai-org/GLM-4.5-Air", "support_finetune": False, "type": "LLM"},
            {"model_name": "moonshotai/Kimi-K2-Instruct-0905", "support_finetune": False, "type": "LLM"},
            {"model_name": "moonshotai/Kimi-Dev-72B", "support_finetune": False, "type": "LLM"},
            {"model_name": "MiniMaxAI/MiniMax-M2", "support_finetune": False, "type": "LLM"},
            {"model_name": "MiniMaxAI/MiniMax-M1-80k", "support_finetune": False, "type": "LLM"},
        ],
        "embedding_list": [
            {"model_name": "BAAI/bge-m3", "support_finetune": False, "type": "embedding"},
            {"model_name": "BAAI/bge-large-zh-v1.5", "support_finetune": False, "type": "embedding"},
            {"model_name": "Qwen/Qwen3-Embedding-8B", "support_finetune": False, "type": "embedding"},
            {"model_name": "Qwen/Qwen3-Embedding-4B", "support_finetune": False, "type": "embedding"},
            {"model_name": "Qwen/Qwen3-Embedding-0.6B", "support_finetune": False, "type": "embedding"},
            {"model_name": "netease-youdao/bce-embedding-base_v1", "support_finetune": False, "type": "embedding"},
        ],
        "reranker_list": [
            {"model_name": "BAAI/bge-reranker-v2-m3", "support_finetune": False, "type": "rerank"},
            {"model_name": "Qwen/Qwen3-Reranker-8B", "support_finetune": False, "type": "rerank"},
            {"model_name": "Qwen/Qwen3-Reranker-4B", "support_finetune": False, "type": "rerank"},
            {"model_name": "Qwen/Qwen3-Reranker-0.6B", "support_finetune": False, "type": "rerank"},
            {"model_name": "netease-youdao/bce-reranker-base_v1", "support_finetune": False, "type": "rerank"},
        ],
        "vqa_list": [
            {"model_name": "Qwen/Qwen3-VL-32B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen/Qwen3-VL-8B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen/Qwen2.5-VL-72B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen/Qwen2.5-VL-32B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen/Qwen2-VL-72B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "deepseek-ai/deepseek-vl2", "support_finetune": False, "type": "VQA"},
            {"model_name": "zai-org/GLM-4.5V", "support_finetune": False, "type": "VQA"},
        ],
        "sd_list": [
            {"model_name": "Qwen/Qwen-Image", "support_finetune": False, "type": "SD"},
            {"model_name": "Qwen/Qwen-Image-Edit", "support_finetune": False, "type": "SD"},
            {"model_name": "Kwai-Kolors/Kolors", "support_finetune": False, "type": "SD"},
        ],
        "tts_list": [
            {"model_name": "fnlp/MOSS-TTSD-v0.5", "support_finetune": False, "type": "TTS"},
            {"model_name": "FunAudioLLM/CosyVoice2-0.5B", "support_finetune": False, "type": "TTS"},
            {"model_name": "IndexTeam/IndexTTS-2", "support_finetune": False, "type": "TTS"},
        ],
        "stt_list": [
            {"model_name": "FunAudioLLM/SenseVoiceSmall", "support_finetune": False, "type": "STT"},
            {"model_name": "TeleAI/TeleSpeechASR", "support_finetune": False, "type": "STT"},
        ],
    },
    "AIPing": {
        "llm_list": [
            {"model_name": "DeepSeek-Math-V2", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-0528", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-Distill-Llama-70B", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-Distill-Llama-8B", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-Distill-Qwen-14B", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-Distill-Qwen-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-R1-Distill-Qwen-7B", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3-0324", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3.1", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3.1-Terminus", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3.2", "support_finetune": False, "type": "LLM"},
            {"model_name": "DeepSeek-V3.2-Exp", "support_finetune": False, "type": "LLM"},
            {"model_name": "ERNIE-4.5-21B-A3B", "support_finetune": False, "type": "LLM"},
            {"model_name": "ERNIE-4.5-300B-A47B", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-4-32B-0414", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-4.5", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-4.5-Air", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-4.6", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-4-9B-0414", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-Z1-32B-0414", "support_finetune": False, "type": "LLM"},
            {"model_name": "GLM-Z1-9B-0414", "support_finetune": False, "type": "LLM"},
            {"model_name": "Hunyuan-A13B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Kimi-K2-0905", "support_finetune": False, "type": "LLM"},
            {"model_name": "Kimi-K2-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Kimi-K2-Thinking", "support_finetune": False, "type": "LLM"},
            {"model_name": "Ling-1T", "support_finetune": False, "type": "LLM"},
            {"model_name": "MiniMax-M1-80k", "support_finetune": False, "type": "LLM"},
            {"model_name": "MiniMax-M2", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen2.5-14B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen2.5-32B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen2.5-72B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen2.5-7B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen2.5-Coder-32B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-14B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-1.7B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-235B-A22B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-235B-A22B-Instruct-2507", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-235B-A22B-Thinking-2507", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-30B-A3B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-30B-A3B-Instruct-2507", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-30B-A3B-Thinking-2507", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-8B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Coder-30B-A3B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Coder-480B-A35B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Max", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Next-80B-A3B-Instruct", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Next-80B-A3B-Thinking", "support_finetune": False, "type": "LLM"},
            {"model_name": "Qwen3-Max", "support_finetune": False, "type": "LLM"},
            {"model_name": "QwQ-32B", "support_finetune": False, "type": "LLM"},
            {"model_name": "Ring-1T", "support_finetune": False, "type": "LLM"},
        ],
        "embedding_list": [
            {"model_name": "Qwen3-Embedding-0.6B", "support_finetune": False, "type": "embedding"},
            {"model_name": "Qwen3-Embedding-4B", "support_finetune": False, "type": "embedding"},
            {"model_name": "Qwen3-Embedding-8B", "support_finetune": False, "type": "embedding"},
            {"model_name": "text-embedding-v1", "support_finetune": False, "type": "embedding"},
        ],
        "reranker_list": [
            {"model_name": "bge-reranker-v2-m3", "support_finetune": False, "type": "rerank"},
            {"model_name": "gte-rerank", "support_finetune": False, "type": "rerank"},
            {"model_name": "Qwen3-Reranker-0.6B", "support_finetune": False, "type": "rerank"},
            {"model_name": "Qwen3-Reranker-8B", "support_finetune": False, "type": "rerank"},
        ],
        "vqa_list": [
            {"model_name": "GLM-4.5V", "support_finetune": False, "type": "VQA"},
            {"model_name": "GLM-4.6V", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen2.5-VL-32B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen2.5-VL-72B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen2.5-VL-7B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen3-VL-235B-A22B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen3-VL-235B-A22B-Thinking", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen3-VL-30B-A3B-Instruct", "support_finetune": False, "type": "VQA"},
            {"model_name": "Qwen3-VL-30B-A3B-Thinking", "support_finetune": False, "type": "VQA"},
        ],
        "sd_list": [
            {"model_name": "Qwen-Image", "support_finetune": False, "type": "SD"},
            {"model_name": "HunyuanImage-3.0", "support_finetune": False, "type": "SD"},
            {"model_name": "即梦文生图 3.0", "support_finetune": False, "type": "SD"},
            {"model_name": "即梦文生图 3.1", "support_finetune": False, "type": "SD"},
            {"model_name": "Doubao-Seedream-4.0", "support_finetune": False, "type": "SD"},
            {"model_name": "Doubao-Seedream-4.5", "support_finetune": False, "type": "SD"},
            {"model_name": "Kolors", "support_finetune": False, "type": "SD"},
            {"model_name": "Qwen-Image-Plus", "support_finetune": False, "type": "SD"},
            {"model_name": "Wan2.5-T2I-Preview", "support_finetune": False, "type": "SD"},
            {"model_name": "Kling-V1", "support_finetune": False, "type": "SD"},
            {"model_name": "Kling-V1.5", "support_finetune": False, "type": "SD"},
            {"model_name": "Kling-V2", "support_finetune": False, "type": "SD"},
            {"model_name": "Kling-V2-new", "support_finetune": False, "type": "SD"},
            {"model_name": "Kling-V2.1", "support_finetune": False, "type": "SD"},
            {"model_name": "即梦图片生成 4.0", "support_finetune": False, "type": "SD"},

        ],
    },
}

# AMS内置的模型
ams_model_list = [
    # localLLM 模型
    {
        "name": "AquilaChat2-7B",
        "key": "BAAI/AquilaChat2-7B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "BAAI"
    },
    {
        "name": "Baichuan2-7B-Chat",
        "key": "Baichuan2-7B-Chat",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Baichuan"
    },
    {
        "name": "Baichuan2-13B-Chat",
        "key": "Baichuan2-13B-Chat",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Baichuan"
    },
    {
        "name": "chatglm3-6b",
        "key": "chatglm3-6b",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "ZhipuAI"
    },
    {
        "name": "ChatGLM2-6B",
        "key": "ChatGLM2-6B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "ZhipuAI"
    },
    {
        "name": "internlm2_5-20b-chat",
        "key": "internlm2_5-20b-chat",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Shanghai AI Lab"
    },
    {
        "name": "internlm2_5-7b-chat",
        "key": "internlm2_5-7b-chat",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Shanghai AI Lab"
    },
    {
        "name": "Meta-Llama-3-8B-Instruct",
        "key": "Meta-Llama-3-8B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Meta"
    },
    {
        "name": "Meta-Llama-3.1-8B-Instruct",
        "key": "Meta-Llama-3.1-8B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Meta"
    },
    {
        "name": "Qwen2.5-Coder-7B",
        "key": "Qwen2.5-Coder-7B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-7B-Instruct",
        "key": "Qwen2.5-7B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-3B-Instruct",
        "key": "Qwen2.5-3B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-1.5B-Instruct",
        "key": "Qwen2.5-1.5B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen/Qwen3-14B",
        "key": "Qwen3-14B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "QwQ-32B",
        "key": "QwQ-32B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "QwQ-32B-AWQ",
        "key": "QwQ-32B-AWQ",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-72B-Instruct",
        "key": "Qwen2.5-72B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen3-32B",
        "key": "Qwen3-32B",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-32B-Instruct",
        "key": "Qwen2.5-32B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen3-32B-AWQ",
        "key": "Qwen3-32B-AWQ",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-72B-Instruct-AWQ",
        "key": "Qwen2.5-72B-Instruct-AWQ",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "localLLM",
        "model_from": "modelscope",
        "framework": "vllm",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },

    # Embedding 模型
    {
        "name": "bge-m3",
        "key": "bge-m3",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "Embedding",
        "model_from": "modelscope",
        "framework": "EmbeddingDeploy",
        "endpoint": "/generate",
        "model_brand": "BAAI"
    },
    {
        "name": "BGE-VL-v1.5-mmeb",
        "key": "BGE-VL-v1.5-mmeb",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "Embedding",
        "model_from": "modelscope",
        "framework": "EmbeddingDeploy",
        "endpoint": "/generate",
        "model_brand": "BAAI"
    },
    {
        "name": "bge-large-zh-v1.5",
        "key": "bge-large-zh-v1.5",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "Embedding",
        "model_from": "modelscope",
        "framework": "EmbeddingDeploy",
        "endpoint": "/generate",
        "model_brand": "BAAI"
    },
    # STT 模型
    {
        "name": "sensevoicesmall",
        "key": "sensevoicesmall",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "STT",
        "model_from": "modelscope",
        "framework": "SenseVoiceDeploy",
        "endpoint": "/generate",
        "model_brand": "Alibaba"
    },

    # TTS 模型
    {
        "name": "bark",
        "key": "bark",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "TTS",
        "model_from": "modelscope",
        "framework": "BarkDeploy",
        "endpoint": "/generate",
        "model_brand": "Suno"
    },
    {
        "name": "ChatTTS",
        "key": "ChatTTS",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "TTS",
        "model_from": "modelscope",
        "framework": "ChatTTSDeploy",
        "endpoint": "/generate",
        "model_brand": "2noise"
    },

    # VQA 模型
    {
        "name": "Mini-InternVL-Chat-2B-V1-5",
        "key": "Mini-InternVL-Chat-2B-V1-5",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "VQA",
        "model_from": "modelscope",
        "framework": "LMDeploy",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Shanghai AI Lab"
    },
    {
        "name": "Qwen2-VL-7B-Instruct",
        "key": "Qwen2-VL-7B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "VQA",
        "model_from": "modelscope",
        "framework": "LMDeploy",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "qwen2.5-vl-3b-instruct",
        "key": "qwen2.5-vl-3b-instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "VQA",
        "model_from": "modelscope",
        "framework": "LMDeploy",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },
    {
        "name": "Qwen2.5-VL-32B-Instruct",
        "key": "Qwen2.5-VL-32B-Instruct",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": False,
        "model_kind": "VQA",
        "model_from": "modelscope",
        "framework": "LMDeploy",
        "endpoint": "/v1/chat/interactive",
        "model_brand": "Alibaba"
    },

    # reranker 模型
    {
        "name": "bge-reranker-large",
        "key": "bge-reranker-large",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "reranker",
        "model_from": "modelscope",
        "framework": "RerankerDeploy",
        "endpoint": "/generate",
        "model_brand": "BAAI"
    },
    {
        "name": "bge-reranker-v2-m3",
        "key": "bge-reranker-v2-m3",
        "model_type": "local",
        "model_status": 1,
        "is_finetune_model": False,
        "can_finetune_model": True,
        "model_kind": "reranker",
        "model_from": "modelscope",
        "framework": "RerankerDeploy",
        "endpoint": "/generate",
        "model_brand": "BAAI"
    }
]

for item in ams_model_list:
    item["model_name"] = item["name"]
