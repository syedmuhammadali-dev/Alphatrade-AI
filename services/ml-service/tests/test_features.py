import numpy as np
import pandas as pd
import pytest

from app.features import build_features, label_forward_return, rsi, ema


def make_candles(closes, volume=1000.0):
    closes = pd.Series(closes, dtype=float)
    return pd.DataFrame(
        {
            "open": closes,
            "high": closes + 0.5,
            "low": closes - 0.5,
            "close": closes,
            "volume": volume,
        }
    )


def test_ema_converges_toward_a_constant_series():
    closes = pd.Series([10.0] * 50)
    result = ema(closes, 20)
    assert result.iloc[-1] == pytest.approx(10.0, abs=1e-6)


def test_rsi_is_high_for_a_strict_uptrend():
    closes = pd.Series([10 + i for i in range(30)], dtype=float)
    result = rsi(closes, 14)
    assert result.iloc[-1] > 90  # every move is up => RSI approaches 100


def test_rsi_is_low_for_a_strict_downtrend():
    closes = pd.Series([100 - i for i in range(30)], dtype=float)
    result = rsi(closes, 14)
    assert result.iloc[-1] < 10


def test_build_features_has_nan_rows_until_enough_history_for_ema200():
    candles = make_candles([10 + i * 0.1 for i in range(250)])
    features = build_features(candles)
    assert features["ema50_over_ema200"].iloc[:199].isna().any()
    assert not features["ema50_over_ema200"].iloc[220:].isna().any()


def test_build_features_rejects_missing_columns():
    with pytest.raises(ValueError):
        build_features(pd.DataFrame({"close": [1, 2, 3]}))


def test_label_forward_return_classifies_bullish_bearish_neutral():
    # Flat, then a sharp rise, then a sharp fall, then flat again.
    closes = [100] * 15 + [100 * 1.02] * 15 + [100 * 0.98] * 15 + [100] * 15
    candles = make_candles(closes)
    labels = label_forward_return(candles, horizon=5, threshold=0.004)

    assert labels.iloc[14] == "BULLISH"  # about to rise
    assert labels.iloc[29] == "BEARISH"  # about to fall
    assert pd.isna(labels.iloc[-1])  # no future left to look at
