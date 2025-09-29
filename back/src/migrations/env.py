import logging
from logging.config import fileConfig

from alembic import context
from flask import current_app

from models import StringUUID

# 这是 Alembic 配置对象，提供对使用中的 .ini 文件值的访问
config = context.config

# 解释 Python 日志的配置文件
# 这一行基本上设置了日志记录器
fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")

# 添加自定义类型到 Alembic 的导入映射中


def get_engine():
    """获取数据库引擎对象。

    尝试从 Flask 应用扩展中获取数据库引擎，兼容不同版本的 Flask-SQLAlchemy。

    Returns:
        Engine: SQLAlchemy 数据库引擎对象。
    """
    try:
        # 适用于 Flask-SQLAlchemy<3 和 Alchemical
        return current_app.extensions["migrate"].db.get_engine()
    except (TypeError, AttributeError):
        # 适用于 Flask-SQLAlchemy>=3
        return current_app.extensions["migrate"].db.engine


def get_engine_url():
    """获取数据库连接 URL 字符串。

    从数据库引擎对象中提取连接 URL，并处理特殊字符转义。

    Returns:
        str: 格式化的数据库连接 URL 字符串。
    """
    try:
        return get_engine().url.render_as_string(hide_password=False).replace("%", "%%")
    except AttributeError:
        return str(get_engine().url).replace("%", "%%")


# 在这里添加您的模型的 MetaData 对象
# 用于 'autogenerate' 支持
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
config.set_main_option("sqlalchemy.url", get_engine_url())
target_db = current_app.extensions["migrate"].db

# 其他来自配置的值，由 env.py 的需求定义，
# 可以获取：
# my_important_option = config.get_main_option("my_important_option")
# ... 等等


def get_metadata():
    """获取数据库元数据对象。

    根据 Flask-SQLAlchemy 版本获取相应的元数据对象。

    Returns:
        MetaData: SQLAlchemy 元数据对象。
    """
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[None]
    return target_db.metadata


def run_migrations_offline():
    """在'离线'模式下运行迁移。

    这仅使用 URL 配置上下文，而不使用 Engine，尽管在这里也可以接受 Engine。
    通过跳过 Engine 创建，我们甚至不需要 DBAPI 可用。

    这里对 context.execute() 的调用将给定字符串输出到脚本输出。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """在'在线'模式下运行迁移。

    在这种情况下，我们需要创建一个 Engine 并将连接与上下文关联。
    """

    # 此回调用于防止在模式没有更改时生成自动迁移
    # 参考: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
        """处理修订指令的回调函数。

        当检测到模式没有变化时，防止生成空的迁移文件。

        Args:
            context: Alembic 上下文对象。
            revision: 修订版本信息。
            directives: 迁移指令列表。
        """
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    def custom_render_item(type_, obj, autogen_context):
        """自定义渲染函数。

        为自定义类型提供特殊的渲染逻辑。

        Args:
            type_: 类型标识符。
            obj: 要渲染的对象。
            autogen_context: 自动生成上下文。

        Returns:
            str or False: 渲染结果字符串，如果不处理则返回 False。
        """
        if isinstance(obj, StringUUID):
            return "StringUUID()"
        return False

    conf_args = current_app.extensions["migrate"].configure_args
    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = process_revision_directives

    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            render_item=custom_render_item,
            **conf_args,
            dialect_opts={"paramstyle": "named"}
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
