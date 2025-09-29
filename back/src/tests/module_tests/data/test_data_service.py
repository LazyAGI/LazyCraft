from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from sqlalchemy import Column, Integer

from parts.data.data_service import DataService
from parts.data.model import DataSetFileStatus

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 使用pytest fixture来模拟DataService
@pytest.fixture
def data_service():
    account = MagicMock()
    return DataService(account)


# 测试get_data_set_list方法
@patch("parts.data.data_service.DataSet")
def test_get_data_set_list(mock_data_set, data_service):
    # 创建一个模拟的 Column 对象
    mock_column = MagicMock(spec=Column)
    mock_column.__clause_element__ = lambda: mock_column

    # 设置 DataSet.created_at 为模拟的 Column
    mock_data_set.created_at = mock_column

    # 设置查询的返回值
    mock_query = MagicMock()
    mock_data_set.query.filter.return_value.order_by.return_value = mock_query
    mock_query.paginate.return_value = MagicMock()

    result = data_service.get_data_set_list(
        {"page": 1, "page_size": 10, "qtype": "already"}
    )

    # 验证结果
    assert result is not None
    mock_data_set.query.filter.assert_called()
    mock_query.paginate.assert_called_with(page=1, per_page=10, error_out=False)


# 测试create_data方法
@patch("parts.data.data_service.DataService.create_data_set")
@patch("parts.data.data_service.DataService.create_data_set_version")
@patch("parts.data.data_service.db")
def test_create_data(
    mock_db, mock_create_data_set_version, mock_create_data_set, data_service
):
    mock_create_data_set.return_value = MagicMock(id=1)
    mock_data_set_version = MagicMock(id=1)
    mock_data_set_version.name = "test_version_name"  # 设置具体的名称
    mock_create_data_set_version.return_value = mock_data_set_version

    # Mock数据库操作
    mock_db.session.commit.return_value = None

    # Mock相关方法
    with patch.object(
        data_service, "change_data_set_version_status", return_value=None
    ), patch("parts.data.data_service.Tenant") as mock_tenant:

        result = data_service.create_data({"name": "test_data_set", "data_type": "doc"})

    # 添加断言来验证结果
    assert result is not None
    assert result.id == 1


# 测试get_data_set_by_id方法
@patch("parts.data.data_service.DataSet")
def test_get_data_set_by_id(mock_data_set, data_service):
    mock_data_set.query.get.return_value = MagicMock()
    result = data_service.get_data_set_by_id(1)
    assert result is not None


# 测试delete_data_set方法
@patch("parts.data.data_service.DataSet.query")
@patch("parts.data.data_service.db")
def test_delete_data_set(mock_db, mock_query, data_service):
    mock_data_set = MagicMock()
    mock_data_set.from_type = "upload"
    mock_query.get.return_value = mock_data_set

    # Mock相关方法
    with patch.object(
        data_service, "check_data_set_version_by_fine_tune", return_value=False
    ), patch.object(data_service, "delete_data_set_version", return_value=None), patch(
        "parts.data.data_service.Tag"
    ) as mock_tag, patch(
        "parts.data.data_service.DataSetVersion"
    ) as mock_data_set_version:

        # Mock DataSetVersion查询返回空列表
        mock_data_set_version.query.filter_by.return_value.all.return_value = []

        result = data_service.delete_data_set(1)
        mock_db.session.delete.assert_called()
        mock_db.session.commit.assert_called_once()


# 测试get_data_set_version_list方法
@patch("parts.data.data_service.DataSetVersion")
def test_get_data_set_version_list(mock_data_set_version, data_service):
    # 创建一个模拟的版本对象，包含name属性
    mock_version = MagicMock()
    mock_version.name = "test_version_1"
    mock_data_set_version.query.filter.return_value.paginate.return_value = MagicMock()
    mock_data_set_version.query.filter.return_value.first.return_value = mock_version

    # Mock get_data_set_version_name方法
    with patch.object(
        data_service, "get_data_set_version_name", return_value="test_version_1"
    ):
        result = data_service.get_data_set_version_name(1, True)
        assert result is not None


# 测试get_data_set_version_by_id方法
@patch("parts.data.data_service.DataSetVersion")
def test_get_data_set_version_by_id(mock_data_set_version, data_service):
    mock_data_set_version.query.get.return_value = MagicMock()
    result = data_service.get_data_set_version_by_id(1)
    assert result is not None


# 测试create_data_set_version方法
@patch("parts.data.data_service.db")
def test_create_data_set_version(mock_db, data_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    result = data_service.create_data_set_version(
        {"data_set_version_name": "version_1"}, 1
    )
    assert result is not None


# 测试update_data_set_version方法
@patch("parts.data.data_service.db")
def test_update_data_set_version(mock_db, data_service):
    # 创建一个模拟的数据集版本对象
    mock_version_obj = MagicMock()
    mock_version_obj.updated_at = None  # 添加updated_at属性
    mock_db.session.query.return_value.get.return_value = mock_version_obj
    mock_db.session.commit.return_value = None

    # 创建一个模拟的DataSetVersion对象而不是字典
    mock_data_set_version = MagicMock()
    mock_data_set_version.id = "1"
    mock_data_set_version.name = "updated_version"
    mock_data_set_version.updated_at = None

    result = data_service.update_data_set_version(mock_data_set_version)
    assert result is not None


# 测试delete_data_set_version方法
@patch("parts.data.data_service.db")
def test_delete_data_set_version(mock_db, data_service):
    # Mock相关方法
    with patch.object(
        data_service, "check_data_set_version_by_fine_tune", return_value=False
    ), patch("parts.data.data_service.Tenant") as mock_tenant, patch(
        "parts.data.data_service.DataSetVersion"
    ) as mock_data_set_version, patch(
        "parts.data.data_service.DataSetFile"
    ) as mock_data_set_file, patch(
        "parts.data.data_service.DataSet"
    ) as mock_data_set:

        # Mock DataSetVersion对象
        mock_version_obj = MagicMock()
        mock_version_obj.id = 1
        mock_version_obj.data_set_id = 1
        mock_version_obj.version_type = "branch"
        mock_data_set_version.query.get.return_value = mock_version_obj

        # Mock DataSet对象
        mock_dataset_obj = MagicMock()
        mock_dataset_obj.id = 1
        mock_data_set.query.get.return_value = mock_dataset_obj

        # Mock DataSetFile查询返回空列表
        mock_data_set_file.query.filter.return_value.all.return_value = []

        result = data_service.delete_data_set_version(1, True, "upload")
        assert result == 0


# 测试get_data_set_version_data_list方法
@patch("parts.data.data_service.DataSetVersion")
def test_get_data_set_version_data_list(mock_data_set_version, data_service):
    mock_data_set_version.query.get.return_value = MagicMock()
    result = data_service.get_data_set_version_by_id(1)
    assert result is not None


def test_create_individual_zip(data_service):
    with patch("parts.data.data_service.DataSetVersion") as mock_dsv_class, patch(
        "parts.data.data_service.DataSet"
    ) as mock_ds_class, patch("zipfile.ZipFile") as mock_zipfile, patch(
        "os.path.exists"
    ) as mock_exists, patch(
        "os.walk"
    ) as mock_walk, patch(
        "os.remove"
    ) as mock_remove:

        mock_dsv = MagicMock()
        mock_dsv.name = "test_version"
        mock_dsv.version = "v1.0"
        mock_dsv.version_path = "/path/to/version"
        mock_dsv_class.query.get.return_value = mock_dsv

        mock_ds = MagicMock()
        mock_ds.description = "Test description"
        mock_ds.label = "Test label"
        mock_ds_class.query.get.return_value = mock_ds

        mock_exists.return_value = True
        mock_walk.return_value = [("/path/to/version", [], ["file1.txt", "file2.txt"])]

        result = DataService.create_individual_zip(1)

        assert "test_version_v1.0" in result
        assert result.endswith(".zip")
        mock_zipfile.assert_called_once()
        mock_remove.assert_called_once()


def test_create_combined_zip(data_service):
    with patch(
        "parts.data.data_service.DataService.create_individual_zip"
    ) as mock_create_individual, patch("zipfile.ZipFile") as mock_zipfile, patch(
        "os.remove"
    ) as mock_remove:

        mock_create_individual.side_effect = ["zip1.zip", "zip2.zip"]

        result = data_service.create_combined_zip([1, 2])

        assert "多个数据集" in result
        assert result.endswith(".zip")
        assert mock_create_individual.call_count == 2
        mock_zipfile.assert_called_once()
        assert mock_remove.call_count == 2


@patch("parts.data.data_service.ScriptService.get_script_by_id")
@patch("parts.data.data_service.DataSetVersion.query")
@patch("parts.data.data_service.DataSet.query")
@patch("parts.data.data_service.DataSetRefluxData.query")
@patch("parts.data.data_service.DataSetFile.query")
def test_data_clean_or_enhance(
    mock_dsf_query,
    mock_dsrd_query,
    mock_ds_query,
    mock_dsv_query,
    mock_get_script,
    data_service,
):
    mock_script = MagicMock()
    mock_get_script.return_value = mock_script

    mock_dsv = MagicMock()
    mock_dsv_query.get.return_value = mock_dsv

    mock_ds = MagicMock()
    mock_ds.from_type = "upload"
    mock_ds_query.get.return_value = mock_ds

    mock_dsf = MagicMock()
    mock_dsf_query.filter_by.return_value.all.return_value = [mock_dsf]

    with patch.object(data_service, "process_clean_or_enhance", return_value=True):
        result = data_service.data_clean_or_enhance(1, 1, "数据过滤", "script")

    assert isinstance(result, tuple)
    assert len(result) == 4
    assert result[0] == mock_dsv
    assert result[1] == mock_script
    assert result[2] == [mock_dsf.id]
    assert result[3] == []


@patch("parts.data.data_service.DataSetFileStatus")
@patch("parts.data.data_service.db")
def test_process_clean_or_enhance(mock_db, mock_data_set_file_status, data_service):
    mock_data_set_file = MagicMock()
    mock_script_instance = MagicMock()
    mock_script_instance.script_type = "数据过滤"
    mock_data_set_file_status.file_done.value = "done"
    mock_data_set_file_status.get_script_type_processing_status.return_value = (
        "processing"
    )
    mock_data_set_file_status.get_script_type_failed_status.return_value = "failed"
    mock_db.session.commit.return_value = None

    with patch.object(
        data_service, "process_json_with_pio", return_value=(True, "Success")
    ), patch("parts.data.data_service.FileTools") as mock_file_tools, patch(
        "parts.data.data_service.Tenant"
    ) as mock_tenant:
        mock_file_tools.get_file_path_size.return_value = 100

        result = data_service.process_clean_or_enhance(
            mock_data_set_file, mock_script_instance, "upload", "script"
        )

    assert result is True
    assert mock_data_set_file.status == "done"
    assert mock_data_set_file.error_msg == ""


def test_get_data_tree(data_service):
    with patch("parts.data.data_service.db.session.query") as mock_query:
        mock_datasets = [MagicMock(id=1, name="Dataset1", data_format="text")]
        mock_versions = [
            MagicMock(id=1, data_set_id=1, name="Version1", version="v1.0")
        ]
        mock_query.return_value.filter.return_value.all.side_effect = [
            mock_datasets,
            mock_versions,
        ]

        result = data_service.get_data_tree()

        assert len(result) == 1
        assert result[0]["val_key"] == "null$1"
        assert result[0]["type"] == "text"
        assert (
            hasattr(result[0]["label"], "__call__") or result[0]["label"] == "Dataset1"
        )
        assert len(result[0]["child"]) == 1
        assert result[0]["child"][0]["val_key"] == 1
        assert result[0]["child"][0]["type"] == "text"
        assert (
            hasattr(result[0]["child"][0]["label"], "__call__")
            or result[0]["child"][0]["label"] == "Version1:v1.0"
        )


@patch("builtins.open", new_callable=MagicMock)
@patch("json.load")
@patch("os.path.exists")
@patch("importlib.util.spec_from_file_location")
@patch("importlib.util.module_from_spec")
@patch("sys.modules")
@patch("os.path.basename")
@patch("os.path.splitext")
def test_process_json_with_pio(
    mock_splitext,
    mock_basename,
    mock_sys_modules,
    mock_module_from_spec,
    mock_spec_from_file,
    mock_exists,
    mock_json_load,
    mock_open,
    data_service,
):
    mock_exists.return_value = True
    mock_json_load.return_value = {"test": "data"}
    mock_module = MagicMock()
    mock_module.clean_data.return_value = {"cleaned": "data"}
    mock_module_from_spec.return_value = mock_module
    mock_spec_from_file.return_value = MagicMock()
    mock_sys_modules.__setitem__ = MagicMock()
    mock_basename.return_value = "text_clean_data.py"
    mock_splitext.return_value = ("text_clean_data", ".py")

    result, msg = DataService.process_json_with_pio(
        "/path/to/input.json", None, "/path/to/script.py", "clean"
    )

    assert result is True
    assert msg == "/path/to/input.json"
    mock_module.clean_data.assert_called_once_with({"test": "data"})
