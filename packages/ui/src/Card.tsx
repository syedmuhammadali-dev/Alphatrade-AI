import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-container-lowest p-space-base rounded shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
