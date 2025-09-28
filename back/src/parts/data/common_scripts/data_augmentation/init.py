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

from .alpaca_backtranslation_augment import backtranslation_augment
from .alpaca_semantic_augment import semantic_augment
from .alpaca_synonym_augment import synonym_augment
from .alpaca_template_augment import template_augment
from .alpaca_typo_augment import typo_augment

__all__ = [
    "synonym_augment",
    "template_augment",
    "typo_augment",
    "backtranslation_augment",
    "semantic_augment",
]
