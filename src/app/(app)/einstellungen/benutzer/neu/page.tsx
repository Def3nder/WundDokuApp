import { redirect } from "next/navigation";
import { NeuerBenutzer } from "../neuer-benutzer";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Benutzer anlegen" };

export default async function NeuerBenutzerSeite() {
  const sitzung = await auth();
  if (sitzung?.user?.rolle !== "ADMIN") redirect("/");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Benutzer", href: "/einstellungen/benutzer" },
        ]} />
        <h1 className="mt-2 text-2xl font-semibold">Benutzer anlegen</h1>
      </div>

      <NeuerBenutzer abbrechenNach="/einstellungen/benutzer" />
    </div>
  );
}
