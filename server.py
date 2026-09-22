"""Laya playground: FastAPI server that loads a Laya checkpoint on CPU and
exposes a single /predict endpoint for the web UI in static/."""
import os
import threading
import time
from typing import Any, Dict

import laya
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

MODEL_ID = os.environ.get("LAYA_MODEL", "convaiinnovations/laya")
SUBFOLDER = os.environ.get("LAYA_SUBFOLDER", "multilingual") or None

app = FastAPI(title="Laya playground")
_state: Dict[str, Any] = {"agent": None, "error": None, "loading": True}


def _load() -> None:
    try:
        t0 = time.time()
        _state["agent"] = laya.load(MODEL_ID, device="cpu", subfolder=SUBFOLDER)
        _state["load_seconds"] = round(time.time() - t0, 1)
    except Exception as exc:  # noqa: BLE001
        _state["error"] = repr(exc)
    finally:
        _state["loading"] = False


threading.Thread(target=_load, daemon=True).start()


class PredictRequest(BaseModel):
    state: Any
    questions: Dict[str, Dict[str, Any]]


@app.get("/api/status")
def status() -> Dict[str, Any]:
    return {
        "model": MODEL_ID,
        "subfolder": SUBFOLDER,
        "loading": _state["loading"],
        "ready": _state["agent"] is not None,
        "error": _state["error"],
        "load_seconds": _state.get("load_seconds"),
    }


@app.post("/api/predict")
def predict(req: PredictRequest) -> Dict[str, Any]:
    if _state["loading"]:
        raise HTTPException(503, "Model still loading")
    if _state["agent"] is None:
        raise HTTPException(500, f"Model failed to load: {_state['error']}")
    if not req.questions:
        raise HTTPException(400, "questions must not be empty")
    try:
        t0 = time.time()
        result = _state["agent"].predict(req.state, req.questions)
        result["latency_ms"] = round((time.time() - t0) * 1000, 1)
        return result
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, str(exc)) from exc


@app.get("/")
def index() -> FileResponse:
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")
