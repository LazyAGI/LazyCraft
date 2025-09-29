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


def _test_run_from_file_by_node_run(filename, query, node_id):
    """从文件通过node_run执行工作流测试"""
    workflow = _load_workflow_from_file(filename)
    executor = EngineExecutor(report_url=None, node_id=node_id)

    graph_dict = executor.process_workflow(workflow)
    executor.start_engine(graph_dict)
    outputs = executor.execute_sync_task(query)
    print(f"查询: {query}, 输出: {outputs}")
    return outputs


# ==================== 业务逻辑测试 ====================


def test_switch_workflow():
    """测试Switch工作流"""
    _print_test_header("Switch工作流测试")

    test_cases = [1, 2, 3]
    for case in test_cases:
        print(f"\n--- 测试用例: {case} ---")
        _test_run_from_file_sync("tes_Switch2.json", case)


def test_if_workflow():
    """测试If工作流"""
    _print_test_header("If工作流测试")

    test_cases = [1, 2, 3]
    for case in test_cases:
        print(f"\n--- 测试用例: {case} ---")
        _test_run_from_file_sync("test_if.json", case)


def test_stream_workflow():
    """测试流式工作流"""
    _print_test_header("流式工作流测试")
    _test_run_from_file_stream("test_if.json", 1)


def test_node_run_workflow():
    """测试node_run工作流"""
    _print_test_header("node_run工作流测试")
    result = _test_run_from_file_by_node_run("code_2_node.json", [1], "1749374621729")
    assert result == "[1 + code1]"

    result = _test_run_from_file_by_node_run("code_2_node.json", [2], "1749374623336")
    assert result == "[2 + code2]"

    result = _test_run_from_file_sync("code_2_node.json", [3])
    assert result == "[[3 + code1] + code2]"

    result = _test_run_from_file_by_node_run("test_if.json", [1], "17483130379970")
    assert result == [4]

    result = _test_run_from_file_by_node_run("test_if.json", [4], "17483130379970")
    assert result == [1]

    result = _test_run_from_file_by_node_run("code_test.json", [1], "1745311574500")
    print(f"result: {result}")
    assert result == [4]


# ==================== 引擎功能测试 ====================


def test_engine_properties():
    """测试引擎基本属性"""
    _print_test_header("引擎属性测试")

    executor = EngineExecutor(report_url=None)
    print(f"引擎ID: {executor.gid}")
    print(f"ID类型: {type(executor.gid)}")
    print(f"ID长度: {len(executor.gid)}")


def test_engine_lifecycle():
    """测试引擎生命周期管理"""
    _print_test_header("引擎生命周期测试")

    executor = EngineExecutor(report_url=None)

    # 测试初始状态
    initial_status = executor.is_engine_running()
    print(f"初始运行状态: {initial_status}")

    # 测试停止引擎
    executor.stop_engine()
    print("执行停止引擎操作")

    # 测试停止后状态
    after_stop_status = executor.is_engine_running()
    print(f"停止后运行状态: {after_stop_status}")

    # 测试获取URL
    web_url, api_url = executor.get_engine_urls()
    print(f"Web URL: '{web_url}'")
    print(f"API URL: '{api_url}'")


def test_server_resource_management():
    """测试服务器资源管理"""
    _print_test_header("服务器资源管理测试")

    executor = EngineExecutor(report_url=None)

    # 测试无server资源的情况
    print("--- 测试添加server资源 ---")
    resources_without_server = [
        {"id": "test1", "kind": "other"},
        {"id": "test2", "kind": "database"},
    ]
    result = executor.add_server_resource_if_needed(resources_without_server)
    print(f"原始资源数量: {len(resources_without_server)}")
    print(f"处理后资源数量: {len(result)}")

    server_resources = [r for r in result if r.get("kind") == "server"]
    print(f"server资源数量: {len(server_resources)}")

    # 测试已有server资源的情况
    print("\n--- 测试已有server资源 ---")
    resources_with_server = [
        {"id": "existing_server", "kind": "server"},
        {"id": "test3", "kind": "other"},
    ]
    result = executor.add_server_resource_if_needed(resources_with_server)
    print(f"原始资源数量: {len(resources_with_server)}")
    print(f"处理后资源数量: {len(result)}")


# ==================== 主函数 ====================


def run_basic_tests():
    """运行基础功能测试"""
    print("开始执行基础功能测试...")
    test_engine_properties()
    test_server_resource_management()
    test_engine_lifecycle()


def run_workflow_tests():
    """运行工作流测试"""
    print("\n开始执行工作流测试...")
    test_switch_workflow()
    test_if_workflow()


def run_stream_tests():
    """运行流式测试"""
    print("\n开始执行流式测试...")
    test_stream_workflow()


def run_all_tests():
    """运行所有测试"""
    print("EngineExecutor 完整测试开始")
    print("=" * 60)

    run_basic_tests()
    run_workflow_tests()
    run_stream_tests()  # 流式测试比较耗时，可选择性运行

    print("\n" + "=" * 60)
    print("所有测试完成")


if __name__ == "__main__":
    # 默认运行基础测试
    test_node_run_workflow()

    # 如需运行所有测试，取消注释下面这行
    # run_all_tests()
