"""
EngineExecutor 测试模块

测试 EngineExecutor 类的各种功能：
- 工作流处理和执行
- 引擎生命周期管理
- 资源管理
- 任务执行（同步/异步）
"""

import json
import os

from parts.app.node_run.engine_executor import EngineExecutor

# ==================== 辅助函数 ====================


def _get_test_file_path(filename):
    """获取测试文件的完整路径"""
    dirname = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(dirname, filename)


def _load_workflow_from_file(filename):
    """从文件加载工作流配置"""
    json_filepath = _get_test_file_path(filename)
    with open(json_filepath) as f_read:
        return json.loads(f_read.read())


def _print_test_header(test_name):
    """打印测试头部信息"""
    print(f"\n{'='*50}")
    print(f"测试: {test_name}")
    print(f"{'='*50}")


# ==================== 核心功能测试 ====================


def _test_run_from_file_sync(filename, query):
    """从文件同步执行工作流测试"""
    workflow = _load_workflow_from_file(filename)
    executor = EngineExecutor(report_url=None)

    graph_dict = executor.process_workflow(workflow)
    executor.start_engine(graph_dict)
    outputs = executor.execute_sync_task(query)
    print(f"查询: {query}, 输出: {outputs}")
    return outputs


def _test_run_from_file_stream(filename, query):
    """从文件流式执行工作流测试"""
    workflow = _load_workflow_from_file(filename)
    executor = EngineExecutor(report_url=None)

    graph_dict = executor.process_workflow(workflow)
    print(f"graph_dict: {graph_dict}")

    executor.start_engine(graph_dict)
    gen = executor.execute_stream_task(query)

    try:
        while True:
            result = next(gen)
            print("流式输出:", result)
    except StopIteration as e:
        final_result = e.value
        print("最终结果:", final_result)


def test_node_run_workflow():
    """测试node_run工作流"""
    _print_test_header("node_run工作流测试")
    result = _test_run_from_file_stream("code_2_node.json", [1], "1749374621729")
    assert result == "[1 + code1]"


if __name__ == "__main__":
    # 默认运行基础测试
    test_node_run_workflow()

    # 如需运行所有测试，取消注释下面这行
    # run_all_tests()
