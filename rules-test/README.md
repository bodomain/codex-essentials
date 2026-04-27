# FastAPI Curl Test

Install dependencies:

```bash
pip3 install --target .python-packages -r requirements.txt
```

Run the server:

```bash
PYTHONPATH=.python-packages python3 -m uvicorn main:app --reload
```

Test with curl:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/hello/Ada?excited=true"
curl http://127.0.0.1:8000/items/1
curl -X POST http://127.0.0.1:8000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"book","price":15.99,"in_stock":true}'
```
