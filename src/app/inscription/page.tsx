import Link from "next/link";
import { AuthLayout } from "@/components/Surface";
import { RegisterForm } from "./ui";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <AuthLayout
      kicker="Inscription"
      title="Choisissez le rôle du compte à créer."
      lead="Candidat, contrôleur, administrateur, partenaire ou délégataire — le bureau ouvert dépend de ce choix."
    >
      <RegisterForm roleInitial={role} />
      <p className="mt-8 text-sm text-[var(--muted)]">
        Déjà inscrit ?{" "}
        <Link href={role ? `/connexion?role=${role}` : "/connexion"} className="font-medium text-[var(--blue)]">
          Connexion
        </Link>
      </p>
    </AuthLayout>
  );
}
