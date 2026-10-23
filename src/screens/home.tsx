import { redirect } from "next/navigation";
import { LandingHome } from "@/components/Vitrine";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(
      session.typeCompte === "collaborateur"
        ? "/bureau"
        : session.typeCompte === "partenaire"
          ? "/partenaire"
          : session.typeCompte === "delegataire"
            ? "/delegue"
            : "/tableau-de-bord",
    );
  }

  return <LandingHome />;
}
