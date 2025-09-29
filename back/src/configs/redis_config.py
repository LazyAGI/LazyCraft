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

from typing import Optional

from pydantic import Field, NonNegativeInt, PositiveInt
from pydantic_settings import BaseSettings


class RedisConfig(BaseSettings):
    """Redis configs"""

    REDIS_HOST: str = Field(description="Redis host", default="localhost")

    REDIS_PORT: PositiveInt = Field(description="Redis port", default=6379)

    REDIS_USERNAME: Optional[str] = Field(description="Redis username", default=None)

    REDIS_PASSWORD: Optional[str] = Field(description="Redis password", default=None)

    REDIS_DB: NonNegativeInt = Field(
        description="Redis database id, default to 0", default=0
    )

    REDIS_USE_SSL: bool = Field(
        description="Whether to use SSL for Redis connection", default=False
    )
