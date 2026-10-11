"""
Pure feature engineering — pandas/numpy only, no I/O. Deliberately
independent of packages/indicators (the TS implementation): this service
is a standalone Python process per the Phase 11 spec, not sharing code
across languages. Formulas are standard (Wilder-smoothed RSI/ATR/ADX, EMA)
and intentionally mirror the TS versions' conventions so the two are
comparable, even though the code itself isn't shared.
"""

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = ["open", "high", "low", "close", "volume"]


def ema(series: pd.Series, period: int) -> pd.Series:
    """NaN until `period` observations exist — matches the TS indicators'
    "null until enough history" convention rather than pandas' default
    biased-but-defined-from-row-0 behavior."""
    return series.ewm(span=period, adjust=False, min_periods=period).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    # avg_loss == 0 with avg_gain > 0 means every move was up — RSI is 100,
    # not NaN (0/0 only happens when there's been no movement at all).
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
        axis=1,
    )
    return ranges.max(axis=1)


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    return true_range(df).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()


def adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    up_move = df["high"].diff()
    down_move = -df["low"].diff()

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr = true_range(df).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(alpha=1 / period, adjust=False, min_periods=period).mean() / tr
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1 / period, adjust=False, min_periods=period).mean() / tr

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()


def build_features(candles: pd.DataFrame) -> pd.DataFrame:
    """Takes a DataFrame with REQUIRED_COLUMNS (oldest row first) and returns
    one engineered feature row per input candle — NaN where there isn't yet
    enough history, same honesty convention the TS indicators use."""
    missing = [c for c in REQUIRED_COLUMNS if c not in candles.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = candles.copy()
    close = df["close"]

    ema20 = ema(close, 20)
    ema50 = ema(close, 50)
    ema200 = ema(close, 200)
    atr14 = atr(df, 14)

    features = pd.DataFrame(
        {
            "rsi14": rsi(close, 14),
            "adx14": adx(df, 14),
            "atr_pct": atr14 / close,
            "ema20_over_ema50": ema20 / ema50 - 1,
            "ema50_over_ema200": ema50 / ema200 - 1,
            "price_over_ema20": close / ema20 - 1,
            "volume_ratio": df["volume"] / df["volume"].rolling(20).mean(),
            "return_5": close.pct_change(5),
            "return_14": close.pct_change(14),
        },
        index=df.index,
    )
    return features


def label_forward_return(candles: pd.DataFrame, horizon: int = 10, threshold: float = 0.004) -> pd.Series:
    """Labels each row by its forward `horizon`-bar return: BULLISH above
    +threshold, BEARISH below -threshold, otherwise NEUTRAL. The last
    `horizon` rows have no label (NaN) — there's no future to look at yet,
    an honest gap rather than a fabricated one."""
    forward_return = candles["close"].shift(-horizon) / candles["close"] - 1
    labels = pd.Series(np.where(forward_return > threshold, "BULLISH", np.where(forward_return < -threshold, "BEARISH", "NEUTRAL")), index=candles.index)
    labels[forward_return.isna()] = np.nan
    return labels
