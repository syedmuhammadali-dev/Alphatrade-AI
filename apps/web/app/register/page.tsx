import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "Register — AlphaTrade AI" };

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
