import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database.db import engine
from backend.models.models import Base
from backend.routers import questions, progress, admin

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="정보처리기사 실기 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(questions.router)
app.include_router(progress.router)
app.include_router(admin.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def root():
    return {"message": "정보처리기사 실기 API"}
