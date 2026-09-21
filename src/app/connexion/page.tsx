import Link from "next/link";
import { AuthLayout } from "@/components/Surface";
import { LoginForm } from "./ui";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <AuthLayout
      kicker="Connexion"
      title="Choisissez votre espace, puis ouvrez votre compte."
      lead="Candidat, contrôleur, administrateur, partenaire ou délégataire — chaque rôle ouvre son propre bureau."
    >
      <LoginForm roleInitial={role} />
      <p className="mt-8 text-sm text-[var(--muted)]">
        Pas encore d’espace ?{" "}
        <Link href={role ? `/inscription?role=${role}` : "/inscription"} className="font-medium text-[var(--blue)]">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
}
