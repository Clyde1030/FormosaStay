#!/bin/bash
# Run script for FormosaStay backend API server using uv

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install it first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Run the server using uv
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

