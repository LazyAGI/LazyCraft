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

from datetime import datetime
from zoneinfo import ZoneInfo

import pytz

china_tz = pytz.timezone("Asia/Shanghai")


class TimeTools:
    """时间处理工具类。

    提供各种时间格式转换、时区处理和时间字符串操作的工具方法。
    主要支持中国时区（Asia/Shanghai）的时间处理。
    """

    @staticmethod
    def get_china_now(output="str"):
        """获取中国当前时间。

        返回中国时区（Asia/Shanghai）的当前时间，可以选择返回字符串格式或 datetime 对象。

        Args:
            output (str, optional): 输出格式。"str" 或 "string" 返回字符串格式，
                                   其他值返回 datetime 对象。默认为 "str"。

        Returns:
            Union[str, datetime]: 如果 output 为 "str" 或 "string"，返回格式化的时间字符串
                                 （YYYY-MM-DD HH:MM:SS），否则返回 datetime 对象。
        """
        now = datetime.now(ZoneInfo("Asia/Shanghai"))
        if output in ["str", "string"]:
            return now.strftime("%Y-%m-%d %H:%M:%S")
        return now

    @staticmethod
    def str_to_date(date_str, pattern="%Y-%m-%d"):
        """将日期字符串转换为日期对象。

        根据指定的格式模式将日期字符串解析为 date 对象。

        Args:
            date_str (str): 要转换的日期字符串。
            pattern (str, optional): 日期格式模式。默认为 "%Y-%m-%d"。

        Returns:
            date: 解析后的日期对象。

        Raises:
            ValueError: 当日期字符串格式不匹配时抛出。
        """
        return datetime.strptime(date_str, pattern).date()

    @staticmethod
    def str_to_datetime(datetime_str, pattern="%Y-%m-%d %H:%M:%S"):
        """将日期时间字符串转换为 datetime 对象。

        根据指定的格式模式将日期时间字符串解析为 datetime 对象。

        Args:
            datetime_str (str): 要转换的日期时间字符串。
            pattern (str, optional): 日期时间格式模式。默认为 "%Y-%m-%d %H:%M:%S"。

        Returns:
            datetime: 解析后的 datetime 对象。

        Raises:
            ValueError: 当日期时间字符串格式不匹配时抛出。
        """
        return datetime.strptime(datetime_str, pattern)

    @staticmethod
    def date_to_str(dt, pattern="%Y-%m-%d"):
        """将日期对象转换为字符串。

        将 date 或 datetime 对象格式化为指定格式的字符串。
        如果格式化失败，会回退到对象的字符串表示。

        Args:
            dt (Union[date, datetime]): 要转换的日期或日期时间对象。
            pattern (str, optional): 日期格式模式。默认为 "%Y-%m-%d"。

        Returns:
            str: 格式化后的日期字符串。
        """
        try:
            return dt.strftime(pattern)
        except ValueError:
            d = dt
            if isinstance(d, datetime):
                d = d.date()
            return d.__str__()

    @staticmethod
    def datetime_to_str(dt, pattern="%Y-%m-%d %H:%M:%S"):
        """将 datetime 对象转换为字符串。

        将 datetime 对象格式化为指定格式的字符串。
        如果格式化失败，会回退到去除微秒的字符串表示。

        Args:
            dt (datetime): 要转换的 datetime 对象。
            pattern (str, optional): 日期时间格式模式。默认为 "%Y-%m-%d %H:%M:%S"。

        Returns:
            str: 格式化后的日期时间字符串。
        """
        try:
            return dt.strftime(pattern)
        except ValueError:
            ret_str = dt.__str__()
            index = ret_str.rfind(".")
            if index >= 0:
                return ret_str[:index]
            else:
                return ret_str

    @staticmethod
    def format_datetime_china_str(date_val):
        """将 datetime 对象格式化为中国时区字符串。

        将 datetime 对象转换为中国时区（Asia/Shanghai）的时间字符串。
        支持带时区信息和不带时区信息的 datetime 对象。

        Args:
            date_val (datetime): 要格式化的 datetime 对象。

        Returns:
            Optional[str]: 格式化后的中国时区时间字符串（YYYY-MM-DD HH:MM:SS），
                          如果输入不是 datetime 对象则返回 None。
        """
        if isinstance(date_val, datetime):
            try:
                # 如果 value 有时区信息，则尝试直接转换
                localized_value = date_val.astimezone(china_tz)
            except ValueError:
                utc_value = date_val.replace(tzinfo=pytz.utc).astimezone(
                    china_tz
                )  # 这通常是不正确的，仅作为错误处理的示例
                localized_value = utc_value
            return localized_value.strftime("%Y-%m-%d %H:%M:%S")
        return None

    @staticmethod
    def now_datetime_china():
        """获取中国时区的当前 datetime 对象（无时区信息）。

        返回中国时区（Asia/Shanghai）的当前时间的 datetime 对象，
        但移除时区信息（naive datetime）。

        Returns:
            datetime: 中国时区的当前时间 datetime 对象（无时区信息）。
        """
        return datetime.now(tz=china_tz).replace(tzinfo=None)
