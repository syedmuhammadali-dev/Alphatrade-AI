"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@alphatrade/ui";
import { FormField } from "./FormField";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Login failed. Please try again.");
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
          Sign in to your terminal
        </h1>
        <p className="font-body-sm text-body-sm text-outline mt-space-2xs">
          Authenticate to access autonomous bot control, market scanner, and risk telemetry.
        </p>
      </div>

      <FormField id="email" name="email" type="email" label="Email" required autoComplete="email" />
      <FormField
        id="password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
      />

      {error && (
        <p className="font-body-sm text-body-sm text-error bg-error-container/20 border border-error/30 rounded px-space-sm py-space-xs">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={loading} className="justify-center">
        {loading ? "Signing in…" : "Sign In"}
      </Button>

      <p className="text-center font-body-sm text-body-sm text-outline">
        No account?{" "}
        <a href="/register" className="text-primary hover:underline">
          Register
        </a>
      </p>
    </form>
  );
}
