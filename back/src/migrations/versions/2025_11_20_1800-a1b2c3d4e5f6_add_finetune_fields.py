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
数据库迁移: add finetune task fields (num_gpus, checkpoint_path, suspended_at)

==========================================
微调任务字段扩展迁移
==========================================

迁移信息:
---------
- 修订版本: <自动生成>
- 基于版本: b77c45897e2a
- 创建时间: 2025-11-20
- 迁移描述: 添加微调任务的GPU数量、checkpoint路径和暂停时间字段

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

# =============================================================================
# 迁移版本标识符
# =============================================================================

# 这些标识符由 Alembic 自动管理，请勿手动修改
revision = 'a1b2c3d4e5f6'
down_revision = 'b77c45897e2a'  # 基于最新的迁移文件
branch_labels = None
depends_on = None


# =============================================================================
# 数据库升级操作
# =============================================================================

def upgrade():
    """
    执行数据库升级操作。
    
    添加以下字段到 finetune_task 表：
    1. num_gpus: 任务使用的GPU数量（默认1）
    2. checkpoint_path: checkpoint保存路径（可选）
    3. suspended_at: 任务暂停时间（可选）
    """
    # 添加num_gpus字段
    op.add_column('finetune_task',
        sa.Column('num_gpus', sa.Integer(), nullable=False, server_default='1', comment='任务使用的GPU数量')
    )
    
    # 添加checkpoint_path字段
    op.add_column('finetune_task',
        sa.Column('checkpoint_path', sa.String(length=500), nullable=True, comment='checkpoint保存路径（目录），用于恢复训练')
    )
    
    # 添加suspended_at字段
    op.add_column('finetune_task',
        sa.Column('suspended_at', sa.DateTime(), nullable=True, comment='任务暂停时间')
    )


# =============================================================================
# 数据库降级操作
# =============================================================================

def downgrade():
    """
    执行数据库降级操作。
    
    移除以下字段：
    1. num_gpus
    2. checkpoint_path
    3. suspended_at
    """
    op.drop_column('finetune_task', 'suspended_at')
    op.drop_column('finetune_task', 'checkpoint_path')
    op.drop_column('finetune_task', 'num_gpus')

