import sys
import os

print(f"CWD: {os.getcwd()}")
try:
    import app.main
    print(f"FOUND: {app.main.__file__}")
except ImportError as e:
    print(f"NOT FOUND: {e}")
except Exception as e:
    print(f"ERROR: {e}")
