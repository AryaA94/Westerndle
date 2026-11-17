import os

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture()
def client(tmp_path):
    # TEST_DATABASE_URL lets CI run the same suite against PostgreSQL.
    url = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    # No photos: the photo-mode tests build their own set.
    app = create_app(url, static_dir=tmp_path / "no-frontend", photo_dir=tmp_path / "no-photos")
    with TestClient(app) as c:
        yield c
    if url.startswith("postgresql"):
        from app.db import Base, make_engine
        Base.metadata.drop_all(make_engine(url))
