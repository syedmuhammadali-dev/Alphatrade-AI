import { useCallback, useEffect, useState } from "react";
import {
  getBotStatus,
  getPaperAccount,
  getPaperPositions,
  getOpportunities,
  runBotAction,
  logout,
  AuthRequiredError,
  type BotStatusResponse,
  type PaperAccount,
  type PaperPosition,
  type RankedOpportunity,
} from "../../lib/api";

const ACTIONS_BY_STATUS: Record<BotStatusResponse["status"], Array<{ action: Parameters<typeof runBotAction>[0]; label: string }>> = {
  stopped: [{ action: "start", label: "Start" }],
  running: [{ action: "pause", label: "Pause" }, { action: "stop", label: "Stop" }],
  paused: [{ action: "resume", label: "Resume" }, { action: "stop", label: "Stop" }],
  emergency_stopped: [{ action: "reset", label: "Reset" }],
};

function fmtUsd(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}$${v.toFixed(2)}`;
}

export function Dashboard({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [bot, setBot] = useState<BotStatusResponse | null>(null);
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [best, setBest] = useState<RankedOpportunity | null>(null);
  const [viewedSymbol, setViewedSymbol] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [botRes, oppsRes] = await Promise.all([getBotStatus(), getOpportunities()]);
      setBot(botRes);
      setBest(oppsRes.opportunities[0] ?? null);

      const accountRes = await getPaperAccount().catch(() => null);
      setAccount(accountRes);
      if (accountRes) {
        const positionsRes = await getPaperPositions();
        setPositions(positionsRes.positions);
      }
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        onLoggedOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [onLoggedOut]);

  useEffect(() => {
    refresh();
    chrome.storage.local.get("alphatrade_viewed_symbol").then((r) => setViewedSymbol(r.alphatrade_viewed_symbol ?? null));
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.alphatrade_viewed_symbol) setViewedSymbol(changes.alphatrade_viewed_symbol.newValue ?? null);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  async function handleAction(action: Parameters<typeof runBotAction>[0]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await runBotAction(action);
      setBot(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    onLoggedOut();
  }

  if (!bot) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>AlphaTrade AI</h1>
        <button onClick={handleLogout}>Log out</button>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", margin: 0 }}>
          <span className="badge">{bot.status.replace("_", " ")}</span>
          <div className="row" style={{ margin: 0 }}>
            {ACTIONS_BY_STATUS[bot.status].map((a) => (
              <button
                key={a.action}
                className={a.action === "emergency-stop" || a.action === "stop" ? "danger" : "primary"}
                disabled={busy}
                onClick={() => handleAction(a.action)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      {viewedSymbol && (
        <div className="card">
          <span className="stat-label">Viewed on this page</span>
          <div className="stat-value">{viewedSymbol}</div>
        </div>
      )}

      {account && (
        <div className="card stat-grid">
          <div>
            <div className="stat-label">Equity</div>
            <div className="stat-value">${account.equityUsd.toFixed(2)}</div>
          </div>
          <div>
            <div className="stat-label">Total P&amp;L</div>
            <div className={`stat-value ${account.equityUsd >= account.startingBalanceUsd ? "positive" : "negative"}`}>
              {fmtUsd(account.equityUsd - account.startingBalanceUsd)}
            </div>
          </div>
          <div>
            <div className="stat-label">Open Positions</div>
            <div className="stat-value">{account.openPositionsCount}</div>
          </div>
        </div>
      )}

      {best && (
        <div className="card">
          <div className="stat-label">Best Opportunity</div>
          <div className="stat-value">
            {best.symbol} · {best.action} ({best.confidence.toFixed(0)}%)
          </div>
          <div className="muted">
            {best.recommendedStrategy ?? "—"} · regime {best.proposal?.regime ?? "—"}
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="card">
          <div className="stat-label">Open Paper Positions</div>
          <ul>
            {positions.slice(0, 5).map((p) => (
              <li key={p.id} className="row" style={{ justifyContent: "space-between", margin: 0 }}>
                <span>{p.symbol}</span>
                <span className={(p.unrealizedPnlUsd ?? 0) >= 0 ? "positive" : "negative"}>
                  {p.unrealizedPnlUsd != null ? fmtUsd(p.unrealizedPnlUsd) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
