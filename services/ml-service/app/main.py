"""
Phase 11's ML service — a swap-in point for the deterministic market
regime detector (packages/market-analysis's RegimeDetector interface),
never a replacement for or participant in execution. This service only
ever classifies bullish/bearish/neutral probability from historical
candles; it has no idea a trade proposal, risk engine, or exchange exist.
"""

import os
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, HTTPException

from .features import build_features
from .model import ModelNotTrainedError, RegimeModel
from .schemas import PredictRequest, PredictResponse

MIN_CANDLES = 200  # enough for EMA200 to have a real value, same floor the TS analysis uses


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = RegimeModel()
    yield


app = FastAPI(title="AlphaTrade AI — ML Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ok": True, "model_available": app.state.model.is_available()}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if len(request.candles) < MIN_CANDLES:
        raise HTTPException(
            status_code=422,
            detail=f"Need at least {MIN_CANDLES} candles to compute every feature; got {len(request.candles)}.",
        )

    df = pd.DataFrame([c.model_dump() for c in request.candles])
    features = build_features(df)

    try:
        result = app.state.model.predict_proba(features)
    except ModelNotTrainedError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err

    return PredictResponse(predicted=result["predicted"], probabilities=result["probabilities"], model_type=result["model_type"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("ML_SERVICE_HOST", "0.0.0.0"), port=int(os.environ.get("ML_SERVICE_PORT", "8000")))
