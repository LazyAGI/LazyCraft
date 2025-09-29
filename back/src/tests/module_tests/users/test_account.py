import os

import pytest

from app import app as _app
from app import db


@pytest.fixture
def fake_app():
    _app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test.db"

    with _app.app_context():
        db.create_all()
    yield _app

    # os.remove('test.db')


@pytest.fixture
def client():
    return fake_app.test_client()


def test_login():
    pass
