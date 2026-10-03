from fastapi import FastAPI, file, HTTPException, query, request, UploadFile


app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}
