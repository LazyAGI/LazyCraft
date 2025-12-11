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

"""
文件类型验证工具模块

使用 filetype 库检测文件的真实类型，防止通过修改文件扩展名绕过安全检查。
"""

import logging
from typing import List, Optional, Tuple

import filetype
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)


TEXT_BASED_TYPES = {
    'svg',      # SVG 是 XML 文本
    'txt',      # 纯文本
    'json',     # JSON 文本
    'jsonl',    # JSON Lines 文本
    'csv',      # CSV 文本
    'html',     # HTML 文本
    'xml',      # XML 文本
    'md',       # Markdown 文本
    'tex',      # LaTeX 文本
}

# 扩展名映射（处理一些特殊情况，如 jpg/jpeg）
EXTENSION_MAPPING = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'tiff': 'tif',
    'tif': 'tif',
}


FILETYPE_EXT_MAPPING = {
    'jpe': 'jpeg',  # filetype 可能返回 jpe
    'tif': 'tiff',  # filetype 可能返回 tif
}


def normalize_extension(ext: str) -> str:
    """标准化文件扩展名
    
    Args:
        ext: 文件扩展名（带或不带点号）
    
    Returns:
        标准化后的扩展名（小写，不带点号）
    """
    ext = ext.lower().lstrip('.')
    return EXTENSION_MAPPING.get(ext, ext)


def validate_file_type(
    file_obj: FileStorage,
    allowed_extensions: List[str],
    strict: bool = True
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    验证文件类型，检测文件扩展名是否与真实类型匹配
    
    Args:
        file_obj: Flask上传的文件对象
        allowed_extensions: 允许的文件扩展名列表，如 ['.jpg', '.png', '.pdf'] 或 ['jpg', 'png', 'pdf']
        strict: 是否严格模式。True 时，扩展名与真实类型必须完全匹配；False 时，对于文本类文件更宽松
    
    Returns:
        (is_valid, detected_type, error_message)
        - is_valid: 是否通过验证
        - detected_type: 检测到的真实文件类型（扩展名，不带点号）
        - error_message: 错误信息（如果验证失败）
    """
    filename = file_obj.filename or ''
    if not filename:
        return False, None, "文件名不能为空"
    
    file_ext = None
    for allowed_ext in allowed_extensions:
        # 处理带点号和不带点号的情况
        normalized_allowed = allowed_ext.lower().lstrip('.')
        if filename.lower().endswith(f".{normalized_allowed}"):
            file_ext = normalized_allowed
            break
    
    if not file_ext:
        return False, None, f"文件扩展名不在允许列表中: {filename}"
    
    try:
        current_pos = file_obj.tell()
        file_obj.seek(0)
        
        file_data = file_obj.read()
        file_obj.seek(current_pos)
        
        if len(file_data) == 0:
            return False, None, "文件为空，无法进行类型检测"
        
        kind = filetype.guess(file_data)
        if kind is None:
            # filetype 无法检测文件类型
            if file_ext in TEXT_BASED_TYPES:
                # 文本文件类型，filetype 可能无法检测，在非严格模式下允许通过
                if not strict:
                    logger.info(f"filetype cannot detect text-based file {file_ext}, allowing through (non-strict mode)")
                    return True, file_ext, None
                else:
                    # 严格模式下，即使无法检测，也要拒绝（防止恶意文件）
                    logger.warning(f"filetype cannot detect file type for {filename}, extension: {file_ext} (strict mode)")
                    return False, None, f"无法识别文件类型，文件扩展名为: .{file_ext}"
            else:
                # 非文本文件类型，filetype 应该能检测到
                logger.warning(f"filetype cannot detect file type for {filename}, extension: {file_ext}")
                if strict:
                    return False, None, f"无法识别文件类型，文件扩展名为: .{file_ext}"
                else:
                    return True, None, None
        
        # filetype 检测到了文件类型
        detected_ext = kind.extension.lower()
        detected_ext = FILETYPE_EXT_MAPPING.get(detected_ext, detected_ext)
        
        normalized_file_ext = normalize_extension(file_ext)
        normalized_detected_ext = normalize_extension(detected_ext)
        
        if normalized_detected_ext != normalized_file_ext:
            error_msg = (
                f"文件扩展名与文件内容不匹配。"
                f"声明的类型: .{file_ext}, 检测到的真实类型: .{detected_ext}。"
                f"这可能是文件扩展名被篡改，请检查文件。"
            )
            logger.warning(
                f"File extension mismatch: filename={filename}, "
                f"declared_ext={file_ext}, detected_ext={detected_ext}"
            )
            return False, detected_ext, error_msg
        
        # 类型匹配，验证通过
        logger.debug(
            f"File type validation passed: filename={filename}, "
            f"extension={file_ext}, detected_type={detected_ext}"
        )
        return True, detected_ext, None
        
    except Exception as e:
        logger.error(f"Error during file type validation: {e}", exc_info=True)
        if strict:
            return False, None, f"文件类型检测过程中发生错误: {str(e)}"
        else:
            logger.warning(f"File type validation error, allowing through (non-strict mode): {e}")
            return True, None, None


def validate_file_type_and_raise(
    file_obj: FileStorage,
    allowed_extensions: List[str],
    strict: bool = True
) -> None:
    """
    验证文件类型，如果验证失败则抛出 ValueError 异常
    
    Args:
        file_obj: Flask上传的文件对象
        allowed_extensions: 允许的文件扩展名列表
        strict: 是否严格模式
    
    Raises:
        ValueError: 当文件类型验证失败时
    """
    is_valid, detected_type, error_message = validate_file_type(
        file_obj, allowed_extensions, strict
    )
    
    if not is_valid:
        raise ValueError(error_message or "文件类型验证失败")
