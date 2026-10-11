"""Loads/saves the trained classifier and wraps prediction. Training itself
lives entirely in training/train.py — this module never fits a model,
only ever loads one that was already fit offline (see CLAUDE.md's "offline
training pipeline, separate from the live path" requirement)."""

from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.joblib"

CLASSES = ["BULLISH", "BEARISH", "NEUTRAL"]


class ModelNotTrainedError(Exception):
    pass


class RegimeModel:
    def __init__(self, path: Path = MODEL_PATH):
        self._path = path
        self._bundle: Optional[dict] = None

    def _load(self) -> dict:
        if self._bundle is None:
            if not self._path.exists():
                raise ModelNotTrainedError(
                    f"No trained model found at {self._path}. Run training/train.py first.",
                )
            self._bundle = joblib.load(self._path)
        return self._bundle

    def is_available(self) -> bool:
        return self._path.exists()

    def predict_proba(self, features: pd.DataFrame) -> dict:
        bundle = self._load()
        model = bundle["model"]
        feature_columns = bundle["feature_columns"]

        row = features[feature_columns].iloc[[-1]]
        if row.isna().any(axis=None):
            raise ValueError("Not enough candle history to compute every feature yet.")

        probabilities = model.predict_proba(row)[0]
        class_order = list(model.classes_)
        by_class = {cls: float(probabilities[class_order.index(cls)]) for cls in CLASSES}

        predicted = max(by_class, key=by_class.get)
        return {"probabilities": by_class, "predicted": predicted, "model_type": bundle.get("model_type", "unknown")}
