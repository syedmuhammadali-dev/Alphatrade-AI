import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "long" | "short" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-container text-on-primary-container hover:bg-primary/80 border border-primary/40",
  long: "bg-secondary text-on-secondary hover:bg-secondary-container",
  short: "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary",
  danger:
    "bg-error-container/20 hover:bg-error-container/40 border border-error/50 hover:border-error text-error",
  ghost:
    "bg-surface-container-high hover:bg-surface-container text-on-surface border border-transparent",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded font-label-caps text-label-caps uppercase font-bold tracking-wider transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
