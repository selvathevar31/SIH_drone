import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import get_db

@pytest.fixture(autouse=True)
def apply_module_db_override(request):
    """
    Automatically re-applies the current test module's override_get_db function 
    to app.dependency_overrides[get_db] before each test to prevent 
    database connection pollution across different test modules.
    """
    if hasattr(request.module, 'override_get_db'):
        app.dependency_overrides[get_db] = request.module.override_get_db
    else:
        # Fallback/clear if the test module has no database override
        app.dependency_overrides.pop(get_db, None)
    yield
