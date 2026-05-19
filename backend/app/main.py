from fastapi import FastAPI

app = FastAPI(title="AI PDF Chat", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}
