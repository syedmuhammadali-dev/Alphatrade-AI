"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@alphatrade/ui";
import { FormField } from "./FormField";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Registration failed. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-space-base">
      <div>
        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          Create your terminal account
        </h1>
        <p className="font-body-sm text-body-sm text-outline mt-space-2xs">
          Paper trading and backtesting are available immediately. Live execution requires
          connecting an exchange with trade-only, non-withdrawal API keys.
        </p>
      </div>

      <FormField id="email" name="email" type="email" label="Email" required autoComplete="email" />
      <FormField
        id="password"
        name="password"
        type="password"
        label="Password"
        required
        minLength={10}
        autoComplete="new-password"
      />
      <FormField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm Password"
        required
        minLength={10}
        autoComplete="new-password"
      />

      {error && (
        <p className="font-body-sm text-body-sm text-error bg-error-container/20 border border-error/30 rounded px-space-sm py-space-xs">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={loading} className="justify-center">
        {loading ? "Creating account…" : "Create Account"}
      </Button>

      <p className="text-center font-body-sm text-body-sm text-outline">
        Already have an account?{" "}
        <a href="/login" className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
