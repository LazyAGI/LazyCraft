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


class ParameterAdapter:
    """参数适配器类。

    用于适配不同平台的微调参数格式。
    """

    def __init__(self):
        """初始化参数适配器。

        初始化标准参数、默认参数和参数映射关系。
        """
        self.standard_params = {
            "training_type": None,
            "val_size": None,
            "num_epochs": None,
            "learning_rate": None,
            "lr_scheduler_type": None,
            "batch_size": None,
            "cutoff_len": None,
            "lora_r": None,
            "lora_rate": None,
        }
        self.default_params = {
            "training_type": "PT",
            "val_size": 0.2,
            "num_epochs": 100,
            "learning_rate": 0.001,
            "lr_scheduler_type": "linear",
            "batch_size": 8,
            "cutoff_len": "2048",
            "lora_r": 8,
            "lora_rate": 10,
        }
        self.param_mappings = {
            "openai": {
                "num_epochs": "hyperparameters.n_epochs",
                "batch_size": "hyperparameters.batch_size",
            },
            "qwen": {
                "training_type": "training_type",
                "num_epochs": "hyper_parameters.n_epochs",
                "batch_size": "hyper_parameters.batch_size",
                "learning_rate": "hyper_parameters.learning_rate",
            },
        }

    def adapt(self, config, platform):
        """适配参数配置。

        根据平台类型将标准参数配置适配为平台特定的格式。

        Args:
            config (dict): 标准参数配置
            platform (str): 平台名称（如'openai', 'qwen'）

        Returns:
            dict: 适配后的参数配置

        Raises:
            KeyError: 当平台映射不存在时
        """
        adapted_config = {}
        param_map = self.param_mappings.get(platform, self.default_params)
        for param, value in config.items():
            mapped_param = param_map.get(param, None)
            if mapped_param is None:
                continue
            if isinstance(mapped_param, str) and "." in mapped_param:
                keys = mapped_param.split(".")
                current_level = adapted_config
                for key in keys[:-1]:
                    if key not in current_level:
                        current_level[key] = {}
                    current_level = current_level[key]
                current_level[keys[-1]] = value
            else:
                adapted_config[mapped_param] = value
        return adapted_config
