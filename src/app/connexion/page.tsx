import Link from "next/link";
import { AuthLayout } from "@/components/Surface";
import { documentsActifs } from "@/lib/lot6";
import { LoginForm } from "./ui";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const docs = await documentsActifs();
  const politique = docs.find((d) => d.type === "confidentialite");

  return (
    <AuthLayout
      kicker="Connexion"
      title="Choisissez votre espace, puis ouvrez votre compte."
      lead="Candidat, contrôleur, administrateur, partenaire ou délégataire — chaque rôle ouvre son propre bureau."
    >
      <LoginForm
        roleInitial={role}
        politique={{
          version: politique?.numeroVersion ?? "2026.2",
          contenu: politique?.contenu ?? "",
        }}
      />
      <p className="mt-5 text-sm text-[var(--muted)]">
        Pas encore d’espace ?{" "}
        <Link href={role ? `/inscription?role=${role}` : "/inscription"} className="font-medium text-[var(--blue)]">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
}
