import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  valueClassName?: string;
  badge?: ReactNode;
  footer?: ReactNode;
}

export function StatTile({ label, value, unit, valueClassName = "", badge, footer }: StatTileProps) {
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between mb-space-sm">
        <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
          {label}
        </span>
        {badge}
      </div>
      <div>
        <div className="flex items-baseline gap-space-xs">
          <span className={`font-headline-xl text-headline-xl tracking-tight text-on-surface ${valueClassName}`}>
            {value}
          </span>
          {unit && <span className="font-label-caps text-label-caps uppercase text-outline">{unit}</span>}
        </div>
        {footer && <div className="mt-space-sm">{footer}</div>}
      </div>
    </Card>
  );
}
