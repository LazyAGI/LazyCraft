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

"""
数据库迁移: ${message}

==========================================
自动生成的数据库迁移文件
==========================================

迁移信息:
---------
- 修订版本: ${up_revision}
- 基于版本: ${down_revision | comma,n}
- 创建时间: ${create_date}
- 迁移描述: ${message}

重要说明:
---------
⚠️  在生产环境执行前，请务必：
   1. 在测试环境中完整验证所有迁移操作
   2. 备份生产数据库
   3. 确认迁移操作的可逆性
   4. 评估大表操作的性能影响
   5. 准备回滚计划

📋 使用方法:
   - 升级到此版本: flask db upgrade
   - 降级到上一版本: flask db downgrade
   - 查看当前版本: flask db current
   - 查看迁移历史: flask db history

🔍 如有疑问，请联系数据库管理员或开发团队。
"""

# =============================================================================
# 导入必要的模块
# =============================================================================

from alembic import op
import sqlalchemy as sa
from models import StringUUID

# 导入其他必要的模块（由 Alembic 自动生成）
${imports if imports else ""}

# =============================================================================
# 迁移版本标识符
# =============================================================================

# 这些标识符由 Alembic 自动管理，请勿手动修改
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


# =============================================================================
# 数据库升级操作
# =============================================================================

def upgrade():
    """
    执行数据库升级操作。
    
    此函数包含将数据库从前一个版本升级到当前版本所需的所有操作。
    
    操作类型可能包括：
    - 创建新表 (op.create_table)
    - 删除表 (op.drop_table)
    - 添加列 (op.add_column)
    - 删除列 (op.drop_column)
    - 修改列 (op.alter_column)
    - 创建索引 (op.create_index)
    - 删除索引 (op.drop_index)
    - 创建外键约束 (op.create_foreign_key)
    - 删除外键约束 (op.drop_constraint)
    - 数据迁移操作
    
    ⚠️  安全提醒：
       - 大表操作可能需要较长时间，请在维护窗口内执行
       - 添加非空列时，确保已有数据的处理策略
       - 删除列或表前，确认数据已正确备份或迁移
       - 索引操作可能会锁定表，注意对业务的影响
    
    📝 执行记录：
       所有操作都会记录在 alembic_version 表中，便于追踪迁移历史。
    """
    # =========================================================================
    # 在此处添加升级操作
    # =========================================================================
    
    % if upgrades:
    ${upgrades}
    % else:
    # 当前迁移无需执行任何升级操作
    # 这可能是一个空迁移或仅包含降级操作的迁移
    pass
    % endif


# =============================================================================
# 数据库降级操作
# =============================================================================

def downgrade():
    """
    执行数据库降级操作。
    
    此函数包含将数据库从当前版本回滚到前一个版本所需的所有操作。
    这些操作应该能够完全撤销 upgrade() 函数中的所有变更。
    
    降级操作特点：
    - 必须与升级操作完全对应
    - 操作顺序通常与升级操作相反
    - 需要考虑数据丢失的风险
    
    ⚠️  重要警告：
       - 降级可能导致数据丢失，特别是删除列或表的操作
       - 某些操作可能不可逆，如数据类型转换
       - 执行前必须确保数据已备份
       - 不是所有迁移都支持安全的降级操作
    
    🔄 常见降级操作：
       - 如果升级时创建了表，降级时应删除表
       - 如果升级时添加了列，降级时应删除列
       - 如果升级时修改了列，降级时应恢复原始定义
       - 如果升级时创建了索引，降级时应删除索引
    
    💡 最佳实践：
       - 优先设计可逆的迁移操作
       - 对于不可逆操作，在注释中明确说明
       - 考虑使用数据迁移来保护重要数据
    """
    # =========================================================================
    # 在此处添加降级操作
    # =========================================================================
    
    % if downgrades:
    ${downgrades}
    % else:
    # 当前迁移无需执行任何降级操作
    # 这可能表示：
    # 1. 这是一个仅添加操作的迁移（如添加索引）
    # 2. 这是一个不可逆的迁移
    # 3. 这是一个空迁移
    pass
    % endif


# =============================================================================
# 迁移操作示例和参考
# =============================================================================

"""
常用迁移操作示例：

1. 创建表：
   op.create_table(
       'account',
       sa.Column('id', sa.String(36), primary_key=True),
       sa.Column('name', sa.String(255), nullable=False),
       sa.Column('email', sa.String(255), nullable=False, unique=True),
       sa.Column('created_at', sa.DateTime(), nullable=False),
   )

2. 删除表：
   op.drop_table('account')

3. 添加列：
   op.add_column('account', sa.Column('phone', sa.String(20), nullable=True))

4. 删除列：
   op.drop_column('account', 'phone')

5. 修改列：
   op.alter_column('account', 'name', type_=sa.String(500))

6. 创建索引：
   op.create_index('idx_account_email', 'account', ['email'])

7. 删除索引：
   op.drop_index('idx_account_email', 'account')

8. 创建外键：
   op.create_foreign_key(
       'fk_user_account_id', 'user', 'account',
       ['account_id'], ['id']
   )

9. 删除外键：
   op.drop_constraint('fk_user_account_id', 'user', type_='foreignkey')

10. 数据迁移：
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE account SET status = 'active' WHERE status IS NULL")
    )
"""