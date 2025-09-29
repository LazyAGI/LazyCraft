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

import logging
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from configs import lazy_config
from utils.util_database import db


# Null pool is used for the celery workers due process forking side effects.
@contextmanager
def session_scope(nullpool: bool) -> Iterator[Session]:
    """提供数据库操作的事务作用域。

    创建一个数据库会话的上下文管理器，自动处理事务的提交和回滚。
    对于 Celery workers，使用 NullPool 以避免进程分叉的副作用。

    Args:
        nullpool: 是否使用 NullPool。当为 True 时，创建无连接池的引擎，
                 适用于 Celery workers；为 False 时，使用默认的数据库会话。

    Yields:
        Session: SQLAlchemy 数据库会话对象。

    Raises:
        SQLAlchemyError: 当数据库操作失败时抛出，会自动回滚事务。

    Example:
        with session_scope(nullpool=True) as session:
            user = session.query(User).first()
            user.name = "New Name"
            # 退出上下文时自动提交
    """
    database_uri = lazy_config.SQLALCHEMY_DATABASE_URI
    if nullpool:
        engine = create_engine(database_uri, poolclass=NullPool)
        session_class = sessionmaker()
        session_class.configure(bind=engine)
        session = session_class()
    else:
        session = db.session()
        session.commit()  # HACK

    try:
        yield session
        session.commit()
    except SQLAlchemyError as ex:
        session.rollback()
        logging.exception(ex)
        raise
    finally:
        session.close()
