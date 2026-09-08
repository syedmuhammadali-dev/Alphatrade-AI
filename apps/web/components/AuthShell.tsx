import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-space-lg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-space-sm mb-space-xl">
          <div className="w-9 h-9 rounded bg-primary-container/20 border border-primary/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">deployed_code</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
              AlphaTrade
            </span>
            <span className="font-headline-lg text-headline-lg font-semibold tracking-tight text-primary">
              AI
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-space-xl shadow-lg">
          {children}
        </div>

        <p className="mt-space-lg text-center font-body-sm text-body-sm text-outline">
          Paper &amp; backtested strategies during development. No guaranteed returns.
        </p>
      </div>
    </div>
  );
}
