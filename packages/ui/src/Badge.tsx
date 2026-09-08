import type { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "positive" | "negative" | "info" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface",
  positive: "bg-secondary/15 text-secondary",
  negative: "bg-error-container/40 text-error",
  info: "bg-primary/10 text-primary",
  warning: "bg-tertiary/15 text-tertiary",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded font-label-caps text-label-caps uppercase leading-none font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
