import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sitzung = await auth();
  if (!sitzung?.user) redirect("/login");

  return <AppShell benutzer={sitzung.user}>{children}</AppShell>;
}
