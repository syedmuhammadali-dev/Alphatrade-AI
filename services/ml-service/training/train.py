"""
Offline training pipeline — deliberately separate from the live path
(app/main.py never fits a model, only loads one this script already
produced). Run it manually:

    python -m training.train --symbol BTCUSDT --interval 1h --days 180

Fetches historical candles directly from Binance's public REST endpoint
(no API key needed — same read-only, unauthenticated access
packages/exchange-client uses), builds features + forward-return labels,
trains both a RandomForestClassifier and a GradientBoostingClassifier,
keeps whichever scores higher on a held-out test split, and writes the
winner to models/model.joblib.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import httpx
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.features import build_features, label_forward_return  # noqa: E402

BINANCE_REST_BASE_URL = "https://api.binance.com"
MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.joblib"
METRICS_PATH = Path(__file__).resolve().parent.parent / "models" / "metrics.json"


def fetch_klines(symbol: str, interval: str, start_ms: int, end_ms: int) -> pd.DataFrame:
    rows = []
    cursor = start_ms
    with httpx.Client(timeout=30.0) as client:
        while cursor < end_ms:
            res = client.get(
                f"{BINANCE_REST_BASE_URL}/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "startTime": cursor, "endTime": end_ms, "limit": 1000},
            )
            res.raise_for_status()
            page = res.json()
            if not page:
                break
            rows.extend(page)
            last_close_time = page[-1][6]
            if last_close_time <= cursor:
                break
            cursor = last_close_time + 1
            if len(page) < 1000:
                break
            time.sleep(0.2)  # be polite to the public endpoint

    df = pd.DataFrame(rows, columns=["open_time", "open", "high", "low", "close", "volume", "close_time", "qv", "n", "tbv", "tqv", "ignore"])
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = df[col].astype(float)
    return df[["open_time", "open", "high", "low", "close", "volume"]]


def build_dataset(candles: pd.DataFrame, horizon: int, threshold: float) -> tuple[pd.DataFrame, pd.Series]:
    features = build_features(candles)
    labels = label_forward_return(candles, horizon=horizon, threshold=threshold)
    dataset = features.join(labels.rename("label"))
    dataset = dataset.dropna()
    return dataset.drop(columns=["label"]), dataset["label"]


def train(symbol: str, interval: str, days: int, horizon: int, threshold: float) -> None:
    end_ms = int(time.time() * 1000)
    start_ms = end_ms - days * 24 * 60 * 60 * 1000

    print(f"Fetching {symbol} {interval} candles for the last {days} days...")
    candles = fetch_klines(symbol, interval, start_ms, end_ms)
    print(f"Fetched {len(candles)} candles.")

    x, y = build_dataset(candles, horizon, threshold)
    print(f"Built {len(x)} labeled rows after dropping warmup/undetermined-future rows.")
    print("Label distribution:\n", y.value_counts())

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, shuffle=False)

    candidates = {
        "RandomForestClassifier": RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42),
        "GradientBoostingClassifier": GradientBoostingClassifier(n_estimators=150, max_depth=3, random_state=42),
    }

    best_name, best_model, best_accuracy = None, None, -1.0
    reports = {}
    for name, model in candidates.items():
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        accuracy = accuracy_score(y_test, predictions)
        reports[name] = {
            "accuracy": accuracy,
            "report": classification_report(y_test, predictions, output_dict=True, zero_division=0),
        }
        print(f"{name}: accuracy={accuracy:.4f}")
        if accuracy > best_accuracy:
            best_name, best_model, best_accuracy = name, model, accuracy

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    import joblib

    joblib.dump(
        {
            "model": best_model,
            "model_type": best_name,
            "feature_columns": list(x.columns),
            "trained_at": pd.Timestamp.utcnow().isoformat(),
            "symbol": symbol,
            "interval": interval,
            "horizon": horizon,
            "threshold": threshold,
        },
        MODEL_PATH,
    )
    METRICS_PATH.write_text(json.dumps({"best_model": best_name, "reports": reports}, indent=2, default=str))
    print(f"Saved best model ({best_name}, accuracy={best_accuracy:.4f}) to {MODEL_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="BTCUSDT")
    parser.add_argument("--interval", default="1h")
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--horizon", type=int, default=10, help="Bars ahead the label looks at.")
    parser.add_argument("--threshold", type=float, default=0.004, help="Forward-return threshold for BULLISH/BEARISH.")
    args = parser.parse_args()

    train(args.symbol, args.interval, args.days, args.horizon, args.threshold)
