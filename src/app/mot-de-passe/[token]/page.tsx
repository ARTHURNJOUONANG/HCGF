import Link from "next/link";
import { AuthLayout } from "@/components/Surface";
import { lireJeton } from "@/lib/mot-de-passe";
import { NouveauMotDePasseForm } from "../ui";

export default async function NouveauMotDePassePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const jeton = await lireJeton(token);

  if (!jeton) {
    return (
      <AuthLayout
        kicker="Accès"
        title="Ce lien ne peut plus ouvrir une session."
        lead="Il a déjà été utilisé, ou l’heure est dépassée. Demandez-en un autre."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/mot-de-passe" className="btn btn-primary">
            Nouveau lien
          </Link>
          <Link href="/connexion" className="btn btn-ghost">
            Connexion
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="Accès"
      title="Choisissez un mot de passe que vous pourrez retenir."
      lead="Au moins 8 caractères. La session s’ouvre ensuite, quel que soit votre rôle."
    >
      <NouveauMotDePasseForm token={token} />
    </AuthLayout>
  );
}
