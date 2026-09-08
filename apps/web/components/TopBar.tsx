import { LogoutButton } from "./LogoutButton";
import type { BotStatus } from "@alphatrade/shared-types";

const STATUS_LABEL: Record<BotStatus, string> = {
  stopped: "BOT STOPPED",
  running: "AUTONOMOUS ACTIVE",
  paused: "BOT PAUSED",
  emergency_stopped: "EMERGENCY STOPPED",
};

const STATUS_TONE: Record<BotStatus, string> = {
  stopped: "bg-surface-container-high text-outline border-outline-variant/40",
  running: "bg-secondary/10 border-secondary/30 text-secondary",
  paused: "bg-tertiary/10 border-tertiary/30 text-tertiary",
  emergency_stopped: "bg-error-container/20 border-error/40 text-error",
};

interface TopBarProps {
  userEmail: string;
  botStatus: BotStatus;
}

export function TopBar({ userEmail, botStatus }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between px-margin-edge select-none">
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="w-7 h-7 rounded bg-primary-container/20 border border-primary/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-base">deployed_code</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              AlphaTrade
            </span>
            <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-primary">
              AI
            </span>
          </div>
        </div>
        <span className="px-space-xs py-space-2xs bg-surface-container-high rounded font-label-caps text-label-caps uppercase text-outline tracking-wider border border-outline-variant/40">
          MVP v0.1 — PHASE 1
        </span>
      </div>

      <div className="flex items-center gap-space-md">
        <div className={`flex items-center gap-space-xs px-space-sm py-space-xs border rounded ${STATUS_TONE[botStatus]}`}>
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
          <span className="font-label-caps text-label-caps uppercase font-bold tracking-wider">
            {STATUS_LABEL[botStatus]}
          </span>
        </div>

        <button
          type="button"
          disabled
          title="Wired up once the autonomous orchestrator ships in Phase 8"
          className="flex items-center gap-space-xs px-space-sm py-1.5 bg-error-container/10 border border-error/30 text-error/60 rounded cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-sm">gpp_bad</span>
          <span className="font-label-caps text-label-caps uppercase font-bold tracking-wider">
            EMERGENCY STOP
          </span>
        </button>

        <div className="h-5 w-px bg-outline-variant/40" />

        <div className="flex items-center gap-space-sm pl-space-xs">
          <div className="flex flex-col items-end text-right">
            <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none">
              {userEmail}
            </span>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
