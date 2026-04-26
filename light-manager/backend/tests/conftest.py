import os
import sys
from pathlib import Path

# Use a per-test-session SQLite file so tests stay isolated from any local DB.
_test_db = Path(__file__).resolve().parent / "_test.db"
if _test_db.exists():
    _test_db.unlink()
os.environ["LIGHT_MANAGER_DB_PATH"] = str(_test_db)

# Make `app` importable when pytest is invoked from the backend/ directory.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))
