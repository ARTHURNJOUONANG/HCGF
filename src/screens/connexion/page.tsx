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
      title="Heureux de vous revoir."
      lead="Un seul identifiant pour tous les espaces : nous ouvrons automatiquement le vôtre — candidat, équipe, partenaire ou délégataire."
    >
      <LoginForm roleInitial={role} />
      <p className="mt-6 text-sm text-[var(--muted)]">
        Pas encore d’espace ?{" "}
        <Link href="/inscription" className="font-semibold text-[var(--accent-ink)]">
          Créer un compte gratuitement
        </Link>
      </p>
    </AuthLayout>
  );
}
