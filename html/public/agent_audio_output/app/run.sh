export SSL_CERT_FILE=$(uv run python -m certifi)
uv run --project .. uvicorn main:app --reload --host 0.0.0.0 --port 8000
