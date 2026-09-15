import Link from "next/link";
import { AuthLayout } from "@/components/Surface";
import { DemandeResetForm } from "./ui";

export default function MotDePassePage() {
  return (
    <AuthLayout
      kicker="Accès"
      title="Un lien pour rouvrir votre espace, sans rien perdre."
      lead="Candidat, conseiller, partenaire ou délégataire : le parcours est le même."
    >
      <DemandeResetForm />
      <p className="mt-8 text-sm text-[var(--muted)]">
        Vous vous souvenez ?{" "}
        <Link href="/connexion" className="font-medium text-[var(--blue)]">
          Connexion
        </Link>
      </p>
    </AuthLayout>
  );
}
