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

import json
import logging
import time
from typing import List, Dict, Any

from sqlalchemy import and_

from models.model_account import Account
from parts.app.app_service import AppService, WorkflowService
from parts.app.node_run.app_run_service import AppRunService, EventHandler
from utils.util_database import db

from .model import App


class AppRestartService:
    """应用重启服务类。
    
    负责在程序启动时重启所有已启动的应用。
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.app_service = AppService()
        self.workflow_service = WorkflowService()
    
    def _parse_sse_data(self, sse_string: str) -> Dict[str, Any]:
        """解析SSE格式的数据。
        
        Args:
            sse_string (str): SSE格式的字符串，如 'data: {"status":"succeeded",...}\n\n'
            
        Returns:
            Dict[str, Any]: 解析后的JSON数据，如果解析失败返回空字典
        """
        try:
            # 提取data:后面的JSON部分
            if sse_string.startswith('data: '):
                json_str = sse_string[6:].strip()  # 移除 'data: ' 前缀
                return json.loads(json_str)
            return {}
        except (json.JSONDecodeError, AttributeError) as e:
            self.logger.warning(f"解析SSE数据失败: {e}, 原始数据: {sse_string}")
            return {}
    
    def _is_success_status(self, sse_data: Dict[str, Any]) -> bool:
        """检查SSE数据是否表示成功状态。
        
        Args:
            sse_data (Dict[str, Any]): 解析后的SSE数据
            
        Returns:
            bool: 是否表示成功状态
        """
        if not sse_data:
            return False
        
        # 检查data字段中的status
        data = sse_data.get('data', {})
        if not data:
            return False
        status = data.get('status', '')
        if not status:
            return False
        return status == 'succeeded'
    
    def get_all_running_apps(self) -> List[App]:
        """获取所有已启动的应用。
        
        Returns:
            List[App]: 已启动的应用列表
        """
        try:
            apps = db.session.query(App).filter(
                and_(
                    App.enable_api == True,
                    App.status == "normal"
                )
            ).all()
            
            self.logger.info(f"找到 {len(apps)} 个已启动的应用")
            return apps
        except Exception as e:
            self.logger.error(f"获取已启动应用失败: {e}")
            return []
    
    def stop_app(self, app: App) -> bool:
        """停止单个应用。
        
        Args:
            app (App): 应用实例
            
        Returns:
            bool: 是否成功停止
        """
        try:
            self.logger.info(f"正在停止应用: {app.name} (ID: {app.id})")
            
            # 更新应用状态为禁用
            app.enable_api = False
            db.session.commit()
            
            self.logger.info(f"应用 {app.name} 停止成功")
            return True
            
        except Exception as e:
            self.logger.error(f"停止应用 {app.name} 失败: {e}")
            return False
    
    def start_app(self, app: App) -> bool:
        """启动单个应用。
        
        Args:
            app (App): 应用实例
            
        Returns:
            bool: 是否成功启动
        """
        try:
            self.logger.info(f"正在启动应用: {app.name} (ID: {app.id})")
            
            # 检查工作流是否存在
            workflow = self.workflow_service.get_published_workflow(app.id)
            if not workflow:
                self.logger.error(f"应用 {app.name} 没有已发布的工作流")
                return False
            
            # 启动应用服务
            app_run = AppRunService.create(app, mode="publish")
            
            def start_generator():
                event_handler: EventHandler = yield from app_run.start_stream(
                    workflow.nested_graph_dict
                )
                return event_handler
            
            # 执行启动操作
            start_gen = start_generator()
            success = False
            try:
                while True:
                    result = next(start_gen)
                    self.logger.debug(f"收到启动结果: {result}")
                    
                    if isinstance(result, str):
                        # 解析SSE数据
                        sse_data = self._parse_sse_data(result)
                        self.logger.debug(f"解析的SSE数据: {sse_data}")
                        
                        if self._is_success_status(sse_data):
                            # 更新应用状态为启用
                            app.enable_api = True
                            db.session.commit()
                            success = True
                            self.logger.info(f"应用 {app.name} 启动成功 (通过SSE数据确认)")
                            break
                    elif hasattr(result, 'is_success') and result.is_success():
                        # 兼容原有的EventHandler方式
                        app.enable_api = True
                        db.session.commit()
                        success = True
                        self.logger.info(f"应用 {app.name} 启动成功 (通过EventHandler确认)")
                        break
            except StopIteration:
                pass
            
            if success:
                self.logger.info(f"应用 {app.name} 启动成功")
            else:
                self.logger.warning(f"应用 {app.name} 启动可能未完全成功")
            return success
        except Exception as e:
            self.logger.error(f"启动应用 {app.name} 失败: {e}")
            return False
    
    def restart_app(self, app: App) -> bool:
        """重启单个应用。
        
        Args:
            app (App): 应用实例
            
        Returns:
            bool: 是否成功重启
        """
        try:
            self.logger.info(f"开始重启应用: {app.name} (ID: {app.id})")
            
            # 先停止应用
            stop_success = self.stop_app(app)
            if not stop_success:
                self.logger.warning(f"应用 {app.name} 停止失败，但继续尝试启动")
            
            # 再启动应用
            start_success = self.start_app(app)
            
            if start_success:
                self.logger.info(f"应用 {app.name} 重启成功")
            else:
                self.logger.error(f"应用 {app.name} 重启失败")
            
            return start_success
            
        except Exception as e:
            self.logger.error(f"重启应用 {app.name} 时发生异常: {e}")
            return False
    
    def restart_all_running_apps(self) -> Dict[str, Any]:
        """重启所有已启动的应用。
        
        Returns:
            Dict[str, Any]: 重启结果统计
        """
        self.logger.info("开始重启所有已启动的应用")
        
        # 获取所有已启动的应用
        running_apps = self.get_all_running_apps()
        
        if not running_apps:
            self.logger.info("没有找到已启动的应用")
            return {
                "total": 0,
                "success": 0,
                "failed": 0,
                "results": []
            }
        
        results = []
        success_count = 0
        failed_count = 0
        
        for app in running_apps:
            try:
                success = self.restart_app(app)
                results.append({
                    "app_id": app.id,
                    "app_name": app.name,
                    "success": success
                })
                
                if success:
                    success_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                self.logger.error(f"重启应用 {app.name} 时发生异常: {e}")
                results.append({
                    "app_id": app.id,
                    "app_name": app.name,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1
        
        result_summary = {
            "total": len(running_apps),
            "success": success_count,
            "failed": failed_count,
            "results": results
        }
        
        self.logger.info(f"应用重启完成: 总计 {len(running_apps)} 个，成功 {success_count} 个，失败 {failed_count} 个")
        
        return result_summary
