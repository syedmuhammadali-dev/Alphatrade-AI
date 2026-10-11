import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.ensemble import RandomForestClassifier

from app.features import build_features
from app.main import app
from app.model import RegimeModel


def make_candle_payload(n=250, trend=0.1):
    closes = [10 + i * trend for i in range(n)]
    return [{"open": c, "high": c + 0.5, "low": c - 0.5, "close": c, "volume": 1000.0} for c in closes]


@pytest.fixture
def client_with_trained_model(tmp_path, monkeypatch):
    # Fit a tiny, deterministic classifier directly on synthetic feature
    # rows — this test only verifies the HTTP contract (request -> feature
    # build -> model.predict_proba -> response shape), not model quality;
    # training/train.py's own numbers are what matter for that.
    candles = pd.DataFrame(
        {
            "open": [10 + i * 0.1 for i in range(250)],
            "high": [10 + i * 0.1 + 0.5 for i in range(250)],
            "low": [10 + i * 0.1 - 0.5 for i in range(250)],
            "close": [10 + i * 0.1 for i in range(250)],
            "volume": 1000.0,
        }
    )
    features = build_features(candles).dropna()
    rng = np.random.default_rng(42)
    labels = rng.choice(["BULLISH", "BEARISH", "NEUTRAL"], size=len(features))

    model = RandomForestClassifier(n_estimators=10, random_state=0)
    model.fit(features, labels)

    import joblib

    model_path = tmp_path / "model.joblib"
    joblib.dump({"model": model, "model_type": "RandomForestClassifier", "feature_columns": list(features.columns)}, model_path)

    app.state.model = RegimeModel(path=model_path)
    return TestClient(app)


def test_health_reports_model_availability(client_with_trained_model):
    res = client_with_trained_model.get("/health")
    assert res.status_code == 200
    assert res.json()["model_available"] is True


def test_predict_returns_probabilities_for_all_three_classes(client_with_trained_model):
    res = client_with_trained_model.post("/predict", json={"candles": make_candle_payload()})
    assert res.status_code == 200
    body = res.json()
    assert body["predicted"] in ("BULLISH", "BEARISH", "NEUTRAL")
    assert set(body["probabilities"].keys()) == {"BULLISH", "BEARISH", "NEUTRAL"}
    assert abs(sum(body["probabilities"].values()) - 1.0) < 1e-6


def test_predict_422s_with_too_few_candles(client_with_trained_model):
    res = client_with_trained_model.post("/predict", json={"candles": make_candle_payload(n=50)})
    assert res.status_code == 422


def test_predict_503s_when_no_model_is_trained(tmp_path):
    app.state.model = RegimeModel(path=tmp_path / "does-not-exist.joblib")
    client = TestClient(app)
    res = client.post("/predict", json={"candles": make_candle_payload()})
    assert res.status_code == 503
