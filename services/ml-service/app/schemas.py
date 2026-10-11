from typing import List, Optional

from pydantic import BaseModel, Field


class CandleIn(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float


class PredictRequest(BaseModel):
    candles: List[CandleIn] = Field(..., min_length=1)


class PredictResponse(BaseModel):
    predicted: str
    probabilities: dict
    model_type: str
