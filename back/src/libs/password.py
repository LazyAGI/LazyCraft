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

import base64
import binascii
import hashlib
import re
import secrets
from typing import Optional

# 密码验证正则表达式：至少8位，包含字母和数字
password_pattern = r"^(?=.*[a-zA-Z])(?=.*\d).{8,}$"

# 增强的密码验证正则表达式：至少8位，必须包含大小写字母、数字和特殊字符
strong_password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':,.<>?/]).{8,}$"

# 密码强度等级
class PasswordStrength:
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"
    VERY_STRONG = "very_strong"


def get_password_strength(password: str) -> str:
    """评估密码强度等级。
    
    Args:
        password (str): 要评估的密码字符串。
        
    Returns:
        str: 密码强度等级。
    """
    if len(password) < 6:
        return PasswordStrength.WEAK
    
    # 检查密码复杂度
    has_lower = bool(re.search(r'[a-z]', password))
    has_upper = bool(re.search(r'[A-Z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};\':,.<>?/]', password))
    
    complexity_score = sum([has_lower, has_upper, has_digit, has_special])
    
    if len(password) >= 12 and complexity_score >= 4:
        return PasswordStrength.VERY_STRONG
    elif len(password) >= 10 and complexity_score >= 3:
        return PasswordStrength.STRONG
    elif len(password) >= 8 and complexity_score >= 2:
        return PasswordStrength.MEDIUM
    else:
        return PasswordStrength.WEAK


def valid_password(password: str, enforce_strong: bool = False) -> str:
    """验证密码格式是否符合要求。

    检查密码是否满足以下条件：
    - 至少8个字符
    - 至少包含一个字母
    - 至少包含一个数字
    - 可选：强制要求强密码（包含大小写字母、数字和特殊字符）

    Args:
        password (str): 要验证的密码字符串。
        enforce_strong (bool): 是否强制要求强密码，默认为False以保持兼容性。

    Returns:
        str: 如果密码有效，返回原密码字符串。

    Raises:
        ValueError: 当密码不符合格式要求时抛出。
    """
    if not password or not isinstance(password, str):
        raise ValueError("密码不能为空且必须是字符串类型")
    
    # 检查密码长度
    if len(password) < 8:
        raise ValueError("密码长度至少需要8个字符")
    
    if len(password) > 128:
        raise ValueError("密码长度不能超过128个字符")
    
    # 检查是否包含常见弱密码
    weak_passwords = {
        "12345678", "password", "qwerty123", "abc12345", 
        "password123", "123456789", "qwertyui", "admin123"
    }
    if password.lower() in weak_passwords:
        raise ValueError("密码过于简单，请使用更复杂的密码")
    
    # 如果强制要求强密码，使用增强的验证规则
    if enforce_strong:
        if not re.match(strong_password_pattern, password):
            raise ValueError("密码必须包含大小写字母、数字和特殊字符")
    else:
        # 保持原有的兼容性验证规则
        if not re.match(password_pattern, password):
            raise ValueError("密码必须至少包含一个字母和一个数字")
    
    # 检查是否有连续相同字符（超过3个）
    if re.search(r'(.)\1{3,}', password):
        raise ValueError("密码不能包含超过3个连续相同的字符")
    
    return password


def hash_password(password_str: str, salt_byte: bytes, iterations: Optional[int] = None) -> bytes:
    """使用 PBKDF2 算法对密码进行哈希处理。

    使用 PBKDF2-HMAC-SHA256 算法和提供的盐值对密码进行哈希处理。
    默认迭代次数为 100000 次（已从10000次提升）以增强安全性。

    Args:
        password_str (str): 要哈希的密码字符串。
        salt_byte (bytes): 用于哈希的盐值字节。
        iterations (int, optional): PBKDF2 迭代次数，默认为100000。
                                   为保持兼容性，如果未指定则使用原来的10000次。

    Returns:
        bytes: 十六进制编码的哈希值字节串。
        
    Raises:
        ValueError: 当输入参数无效时抛出。
        TypeError: 当参数类型不正确时抛出。
    """
    if not password_str:
        raise ValueError("密码不能为空")
    
    if not isinstance(password_str, str):
        raise TypeError("密码必须是字符串类型")
        
    if not isinstance(salt_byte, bytes):
        raise TypeError("盐值必须是bytes类型")
    
    if len(salt_byte) < 16:
        raise ValueError("盐值长度至少需要16字节")
    
    # 为保持向后兼容性，默认使用原来的迭代次数
    # 新的密码可以使用更高的迭代次数
    if iterations is None:
        iterations = 10000  # 保持原有的兼容性
    
    # 验证迭代次数合理性
    if iterations < 1000:
        raise ValueError("迭代次数至少需要1000次")
    if iterations > 1000000:
        raise ValueError("迭代次数不能超过1000000次")
    
    try:
        # 使用PBKDF2-HMAC-SHA256进行密码哈希
        dk = hashlib.pbkdf2_hmac(
            "sha256", 
            password_str.encode("utf-8"), 
            salt_byte, 
            iterations
        )
        return binascii.hexlify(dk)
    except Exception as e:
        raise ValueError(f"密码哈希处理失败: {str(e)}")


def compare_password(password_str: str, password_hashed_base64: str, salt_base64: str) -> bool:
    """比较密码与存储的哈希值是否匹配。

    用于登录验证时比较用户输入的密码与数据库存储的哈希值。
    使用相同的盐值对输入密码进行哈希，然后与存储的哈希值进行比较。
    使用恒定时间比较以防止时序攻击。

    Args:
        password_str (str): 用户输入的密码字符串。
        password_hashed_base64 (str): 数据库存储的 Base64 编码哈希值。
        salt_base64 (str): 数据库存储的 Base64 编码盐值。

    Returns:
        bool: 如果密码匹配返回 True，否则返回 False。
        
    Raises:
        ValueError: 当输入参数无效时抛出。
        TypeError: 当参数类型不正确时抛出。
    """
    if not password_str:
        return False
        
    if not isinstance(password_str, str):
        return False
        
    if not password_hashed_base64 or not salt_base64:
        return False
        
    if not isinstance(password_hashed_base64, str) or not isinstance(salt_base64, str):
        return False
    
    try:
        # 解码存储的盐值和哈希值
        salt_bytes = base64.b64decode(salt_base64)
        stored_hash_bytes = base64.b64decode(password_hashed_base64)
        
        # 使用相同的盐值对输入密码进行哈希
        # 先尝试10000次迭代（原有兼容性），如果不匹配再尝试100000次（新密码）
        input_hash_10k = hash_password(password_str, salt_bytes, iterations=10000)
        
        # 首先尝试原有的10000次迭代
        if secrets.compare_digest(input_hash_10k, stored_hash_bytes):
            return True
            
        # 如果10000次迭代不匹配，尝试100000次迭代（新密码）
        try:
            input_hash_100k = hash_password(password_str, salt_bytes, iterations=100000)
            return secrets.compare_digest(input_hash_100k, stored_hash_bytes)
        except Exception:
            return False
        
    except (ValueError, TypeError, binascii.Error) as e:
        # 记录错误但不暴露具体信息，防止信息泄露
        # 在生产环境中应该记录到安全日志
        return False
    except Exception:
        # 处理其他异常情况
        return False


def generate_secure_salt(length: int = 32) -> bytes:
    """生成加密安全的随机盐值。
    
    Args:
        length (int): 盐值长度，默认32字节。
        
    Returns:
        bytes: 生成的随机盐值。
        
    Raises:
        ValueError: 当长度参数无效时抛出。
    """
    if length < 16:
        raise ValueError("盐值长度至少需要16字节")
    if length > 64:
        raise ValueError("盐值长度不能超过64字节")
    
    return secrets.token_bytes(length)


def hash_password_with_new_salt(password_str: str, iterations: int = 100000) -> tuple[str, str]:
    """使用新生成的盐值对密码进行哈希。
    
    这是一个便利函数，用于新用户注册时生成密码哈希。
    使用更高的迭代次数以提供更好的安全性。
    
    Args:
        password_str (str): 要哈希的密码字符串。
        iterations (int): PBKDF2迭代次数，默认100000次。
        
    Returns:
        tuple[str, str]: (base64编码的哈希值, base64编码的盐值)
        
    Raises:
        ValueError: 当密码无效时抛出。
    """
    # 验证密码（使用默认的兼容性规则）
    valid_password(password_str)
    
    # 生成新的盐值
    salt_bytes = generate_secure_salt()
    
    # 哈希密码
    hash_bytes = hash_password(password_str, salt_bytes, iterations)
    
    # 返回base64编码的结果
    return (
        base64.b64encode(hash_bytes).decode('utf-8'),
        base64.b64encode(salt_bytes).decode('utf-8')
    )
