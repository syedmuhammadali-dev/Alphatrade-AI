import { redirect } from "next/navigation";
import type { User, BotStatusResponse } from "@alphatrade/shared-types";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { serverApiFetch } from "@/lib/server-api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const meRes = await serverApiFetch("/auth/me");
  if (!meRes.ok) {
    redirect("/login");
  }
  const { user }: { user: User } = await meRes.json();

  const statusRes = await serverApiFetch("/bot/status");
  const botStatus: BotStatusResponse = statusRes.ok
    ? await statusRes.json()
    : { status: "stopped", name: "Default Bot", updatedAt: new Date().toISOString() };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar userEmail={user.email} botStatus={botStatus.status} />
      <Sidebar />
      <div className="pl-64">
        <main className="w-full pt-14 min-h-screen bg-background text-on-surface">
          <div className="flex flex-col w-full p-gutter-terminal gap-gutter-terminal">{children}</div>
        </main>
      </div>
    </div>
  );
}
