import json
import os
import hashlib
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import boto3
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# Load environment variables from a local .env file if present
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "DEV").upper()


def votes_base_path() -> Path:
    """
    Resolve where vote records should be stored.
    Defaults to <DAGSTER_HOME>/data/web/votes for local dev.
    """
    base = os.environ.get("VOTES_PATH")
    if base:
        return Path(base)
    dagster_home = os.environ.get("DAGSTER_HOME", ".")
    return Path(dagster_home) / "data" / "web" / "votes"


def s3_client():
    return boto3.client("s3")


def s3_votes_config() -> tuple[str | None, str]:
    bucket = os.environ.get("S3_BUCKET")
    prefix = os.environ.get("S3_VOTES_PREFIX", "votes/")
    return bucket, prefix.rstrip("/") + "/"


def hash_ip(ip: str | None) -> str | None:
    """
    One-way hash of IP for coarse dedupe/abuse monitoring.
    Only applied if IP_HASH_SALT is set.
    """
    if not ip:
        return None
    salt = os.environ.get("IP_HASH_SALT")
    if not salt:
        return None
    return hashlib.sha256(f"{ip}{salt}".encode("utf-8")).hexdigest()


class Vote(BaseModel):
    matchup_id: str = Field(..., description="Client-generated matchup identifier")
    player_a_id: int
    player_b_id: int
    winner_id: int
    gender: str = Field("men", description="Voting currently limited to men")
    client_version: str | None = None
    seed_rating_a: float | None = None
    seed_rating_b: float | None = None


app = FastAPI(title="Top Lines Voting API", version="0.1.0")

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env == "*":
    cors_origins = ["*"]
elif allowed_origins_env:
    cors_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",  # vite preview
        "http://127.0.0.1:4173",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:5181",
        "http://127.0.0.1:5181",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/vote")
async def submit_vote(vote: Vote, request: Request) -> dict:
    if vote.gender != "men":
        raise HTTPException(status_code=400, detail="Voting is currently enabled for men only.")

    received_at = datetime.utcnow()
    request_id = uuid4().hex

    record = {
        "request_id": request_id,
        "received_at": received_at.isoformat(),
        **vote.dict(),
        "user_agent": request.headers.get("user-agent"),
        "ip_hash": hash_ip(request.client.host if request.client else None),
    }

    if ENVIRONMENT == "PROD":
        bucket, prefix = s3_votes_config()
        if not bucket:
            raise HTTPException(status_code=500, detail="S3_BUCKET not configured for PROD")
        key = f"{prefix}{received_at.strftime('%Y-%m-%d')}/{request_id}.json"
        s3_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(record, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
    else:
        base_path = votes_base_path()
        target_dir = base_path / received_at.strftime("%Y-%m-%d")
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / f"{request_id}.json"
        target_file.write_text(json.dumps(record, ensure_ascii=False, indent=2))

    return {"status": "ok", "id": request_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
