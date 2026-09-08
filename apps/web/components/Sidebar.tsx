"use client";

import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  trailing?: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Overview" },
  { href: "/dashboard/bot", icon: "memory", label: "Autonomous Bot", trailing: "Phase 8", disabled: true },
  { href: "/dashboard/scanner", icon: "radar", label: "Market Scanner" },
  { href: "/dashboard/decisions", icon: "psychology", label: "AI Decisions", trailing: "Phase 4", disabled: true },
  { href: "/dashboard/trades", icon: "candlestick_chart", label: "Active Trades", trailing: "Phase 9", disabled: true },
  { href: "/dashboard/strategies", icon: "tune", label: "Strategy Engine", trailing: "Phase 4", disabled: true },
  { href: "/dashboard/backtesting", icon: "history_toggle_off", label: "Backtesting", trailing: "Phase 7", disabled: true },
  { href: "/dashboard/risk", icon: "shield", label: "Risk & Security", trailing: "Phase 5", disabled: true },
  { href: "/dashboard/settings", icon: "settings", label: "Settings", trailing: "Phase 9", disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-surface-container-lowest border-r border-outline-variant/30 z-40 flex flex-col justify-between select-none">
      <div className="flex flex-col py-space-sm">
        <div className="px-space-md py-space-xs">
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline font-semibold">
            TERMINAL WORKSPACE
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 px-space-xs mt-space-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.disabled ? undefined : item.href}
                aria-current={isActive ? "page" : undefined}
                aria-disabled={item.disabled}
                title={item.disabled ? `Ships in ${item.trailing}` : undefined}
                className={`group flex items-center justify-between px-space-sm py-2 rounded transition-colors ${
                  isActive
                    ? "bg-surface-container text-primary font-semibold border-l-2 border-primary"
                    : item.disabled
                      ? "text-outline/50 cursor-not-allowed"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-lg text-outline group-hover:text-on-surface">
                    {item.icon}
                  </span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>
                {item.trailing && (
                  <span className="font-label-numeric-sm text-label-numeric-sm text-outline group-hover:text-on-surface-variant">
                    {item.trailing}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>
      <div className="p-space-sm border-t border-outline-variant/30 flex flex-col gap-space-xs bg-surface-container-lowest">
        <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm text-outline">
          <span className="uppercase font-label-caps text-label-caps">PHASE</span>
          <span>2 / 11</span>
        </div>
        <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
          <div className="bg-primary h-full" style={{ width: "18%" }} />
        </div>
      </div>
    </aside>
  );
}
