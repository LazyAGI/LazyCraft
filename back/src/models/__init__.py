"""
数据库模型和自定义类型定义。

该模块包含项目中使用的自定义 SQLAlchemy 类型和模型基类。
"""

import uuid
import logging
from typing import Any, Optional

from sqlalchemy import CHAR, TypeDecorator
from sqlalchemy.dialects.mysql import CHAR as MySQLChar
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID


logger = logging.getLogger(__name__)


class StringUUID(TypeDecorator):
    """
    字符串格式的 UUID 数据类型。
    
    这是一个 SQLAlchemy 自定义类型，用于在数据库中存储 UUID 值。
    支持多种数据库后端，自动处理不同格式之间的转换。
    
    特性：
    - 支持 MySQL、PostgreSQL、SQLite 等多种数据库
    - 自动处理 UUID 对象、字符串、None 值的转换
    - 统一的 36 字符长度存储格式（带连字符）
    - 高性能缓存支持
    - 完整的错误处理和日志记录
    
    存储格式：
    - MySQL: CHAR(36) - "550e8400-e29b-41d4-a716-446655440000"
    - PostgreSQL: 优先使用原生 UUID 类型，回退到 CHAR(36)
    - 其他数据库: CHAR(36)
    
    使用示例：
        class User(Base):
            id = Column(StringUUID(), primary_key=True, default=lambda: str(uuid.uuid4()))
            name = Column(String(255))
    """
    
    # 指定基础实现类型
    impl = CHAR
    
    # 允许 SQLAlchemy 缓存这个类型，提高查询性能
    cache_ok = True
    
    def __init__(self, length: int = 36):
        """
        初始化 StringUUID 类型。
        
        Args:
            length (int): 存储长度，默认 36 字符（标准 UUID 格式）
        """
        self.length = length
        super().__init__()

    def load_dialect_impl(self, dialect):
        """
        根据不同的数据库方言加载适当的类型实现。
        
        为不同的数据库选择最优的存储类型：
        - PostgreSQL: 优先使用原生 UUID 类型
        - MySQL: 使用 MySQL 优化的 CHAR 类型
        - 其他: 使用标准 CHAR 类型
        
        Args:
            dialect: SQLAlchemy 数据库方言对象
            
        Returns:
            适合当前数据库的类型描述符
        """
        if dialect.name == "postgresql":
            # PostgreSQL 有原生 UUID 支持，性能更好
            try:
                return dialect.type_descriptor(PostgreSQLUUID())
            except ImportError:
                # 如果 PostgreSQL 驱动不支持 UUID，回退到 CHAR
                logger.warning("PostgreSQL UUID 类型不可用，回退到 CHAR 类型")
                return dialect.type_descriptor(CHAR(self.length))
        elif dialect.name == "mysql":
            # MySQL 使用专门优化的 CHAR 类型
            return dialect.type_descriptor(MySQLChar(self.length))
        else:
            # 其他数据库使用标准 CHAR 类型
            return dialect.type_descriptor(CHAR(self.length))

    def process_bind_param(self, value: Any, dialect) -> Optional[str]:
        """
        处理将 Python 值绑定到 SQL 语句时的转换。
        
        将各种输入格式转换为数据库存储格式：
        - None 值保持不变
        - UUID 对象转换为标准字符串格式
        - 字符串进行验证和格式化
        - 无效值记录错误并返回 None
        
        Args:
            value: 要转换的 Python 值
            dialect: 数据库方言对象
            
        Returns:
            转换后的字符串值，用于数据库存储
        """
        if value is None:
            return None
        
        try:
            # 处理 UUID 对象
            if isinstance(value, uuid.UUID):
                return str(value).lower()
            
            # 处理字符串值
            if isinstance(value, str):
                # 去除空白字符
                value = value.strip()
                
                # 处理空字符串
                if not value:
                    return None
                
                # 验证并格式化 UUID 字符串
                try:
                    uuid_obj = uuid.UUID(value)
                    return str(uuid_obj).lower()
                except ValueError as e:
                    logger.error(f"无效的 UUID 字符串格式: '{value}' - {e}")
                    return None
            
            # 尝试转换其他类型
            try:
                uuid_obj = uuid.UUID(str(value))
                return str(uuid_obj).lower()
            except (ValueError, TypeError) as e:
                logger.error(f"无法将值转换为 UUID: '{value}' (类型: {type(value)}) - {e}")
                return None
                
        except Exception as e:
            logger.error(f"UUID 绑定参数处理异常: '{value}' - {e}")
            return None

    def process_result_value(self, value: Any, dialect) -> Optional[str]:
        """
        处理从数据库读取数据时的转换。
        
        将数据库中存储的值转换为 Python 字符串格式：
        - None 值保持不变
        - 数据库值转换为标准 UUID 字符串格式
        - 处理不同数据库可能的格式差异
        
        Args:
            value: 从数据库读取的原始值
            dialect: 数据库方言对象
            
        Returns:
            标准化的 UUID 字符串
        """
        if value is None:
            return None
        
        try:
            # PostgreSQL 原生 UUID 类型可能返回 UUID 对象
            if isinstance(value, uuid.UUID):
                return str(value).lower()
            
            # 字符串类型处理
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                
                # 验证并标准化格式
                try:
                    uuid_obj = uuid.UUID(value)
                    return str(uuid_obj).lower()
                except ValueError as e:
                    logger.warning(f"数据库中的 UUID 值格式异常: '{value}' - {e}")
                    # 如果格式异常但不为空，返回原值
                    return str(value)
            
            # 处理其他可能的类型
            return str(value).strip() if value else None
            
        except Exception as e:
            logger.error(f"UUID 结果值处理异常: '{value}' - {e}")
            return str(value) if value is not None else None

    def __repr__(self) -> str:
        """返回类型的字符串表示。"""
        return f"StringUUID(length={self.length})"
