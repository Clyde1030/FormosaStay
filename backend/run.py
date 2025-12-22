#!/usr/bin/env python3
"""
Run script for FormosaStay backend API server

Usage (with uv):
    uv run python run.py
    OR
    ./run.sh

Usage (with pip/venv):
    python run.py
    OR
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import sys
import subprocess
import os

def run_with_uv():
    """Run uvicorn using uv"""
    try:
        subprocess.run(
            ["uv", "run", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error running with uv: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: uv not found. Please install uv or use: python run.py", file=sys.stderr)
        sys.exit(1)

def run_directly():
    """Run uvicorn directly (requires uvicorn to be installed)"""
    try:
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Enable auto-reload for development
        )
    except ImportError:
        print("Error: uvicorn not found.", file=sys.stderr)
        print("If you installed dependencies with uv, use: uv run python run.py", file=sys.stderr)
        print("Or install dependencies: pip install -e .", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Check if uv is available and if we're in a uv environment
    # If uv is available, prefer using it
    if os.environ.get("UV_PROJECT_ENVIRONMENT") or (os.path.exists(".venv") and os.path.exists("uv.lock")):
        # We're in a uv-managed project, use uv run
        run_with_uv()
    else:
        # Try to run directly, fall back to uv if available
        try:
            run_directly()
        except:
            # If direct run fails, try with uv as fallback
            if subprocess.run(["which", "uv"], capture_output=True).returncode == 0:
                print("Attempting to run with uv...")
                run_with_uv()
            else:
                raise

