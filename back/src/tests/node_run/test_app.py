import json
import os

from run_util import _load_workflow_from_file, init_all

from parts.app.node_run.app_run_service import AppRunService
from parts.app.node_run.run_context import RunContext


def test_app_start(filename):
    run_context = RunContext(app_id="e90b2597-357b-4792-8f22-0ad9a4d8d2c2")
    workflow = _load_workflow_from_file(filename)
    app_run_service = AppRunService(run_context)
    app_run_service.start(workflow)


def test_app_start_stream(filename):
    run_context = RunContext(app_id="e90b2597-357b-4792-8f22-0ad9a4d8d2c2")
    workflow = _load_workflow_from_file(filename)
    app_run_service = AppRunService(run_context)
    for event in app_run_service.start_stream(workflow):
        print(event)


def test_app_run_stream(filename):
    run_context = RunContext(app_id="e90b2597-357b-4792-8f22-0ad9a4d8d2c2")
    workflow = _load_workflow_from_file(filename)
    app_run_service = AppRunService(run_context)
    app_run_service.start(workflow)
    for event in app_run_service.run_stream(inputs=["3"]):
        print(event)


def test_app_run_one_node_stream(filename):
    workflow = _load_workflow_from_file(filename)
    app_run_service = AppRunService.create_by_app_id(
        app_id="e90b2597-357b-4792-8f22-0ad9a4d8d2c2", node_id="1750059857089"
    )
    app_run_service.start(workflow)
    for event in app_run_service.run_stream(inputs=["3"]):
        print(event)


if __name__ == "__main__":
    init_all()
    test_app_run_one_node_stream("test_llm.json")
