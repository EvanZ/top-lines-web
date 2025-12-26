# Top Lines Voting API

FastAPI microservice to accept anonymous prospect voting events. Votes are written as JSON blobs so Dagster can batch-aggregate Elo ratings later.

## Run locally

```bash
cd top-lines-web/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend can hit `http://localhost:8000/api/vote` (set `VITE_API_BASE=http://localhost:8000`).

## Configuration

- `VOTES_PATH`: Where to store vote JSON files (default: `<DAGSTER_HOME>/data/web/votes`).
- `DAGSTER_HOME`: Used only if `VOTES_PATH` is unset.
- `ALLOWED_ORIGINS`: Comma-separated origins for CORS (default allows Vite dev/preview).
- `IP_HASH_SALT`: If set, IPs are hashed for coarse dedupe/abuse signals; leave unset to skip.

## API

- `GET /api/health` — basic health check.
- `POST /api/vote` — body:
  ```json
  {
    "matchup_id": "uuid-from-client",
    "player_a_id": 123,
    "player_b_id": 456,
    "winner_id": 123,
    "gender": "men",
    "client_version": "web-0.1.0",
    "seed_rating_a": 1500.0,
    "seed_rating_b": 1500.0
  }
  ```
  Response: `{"status": "ok", "id": "<vote-id>"}`. Records are appended under `VOTES_PATH/YYYY-MM-DD/<id>.json`.
