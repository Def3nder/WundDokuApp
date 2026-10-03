import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegistrierung } from "@/components/service-worker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sitzung = await auth();
  if (!sitzung?.user) redirect("/login");

  return (
    <>
      <ServiceWorkerRegistrierung />
      <AppShell benutzer={sitzung.user}>{children}</AppShell>
    </>
  );
}
