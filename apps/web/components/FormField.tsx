import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, id, ...props }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-space-2xs">
      <label
        htmlFor={id}
        className="font-label-caps text-label-caps uppercase text-outline tracking-wider"
      >
        {label}
      </label>
      <input
        id={id}
        className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
        {...props}
      />
    </div>
  );
}
