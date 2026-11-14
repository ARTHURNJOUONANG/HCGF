import { notFound } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/Chrome";
import { prisma } from "@/lib/prisma";
import { PaysNom } from "@/components/Pays";
import { limiterAction } from "@/lib/auth";

export default async function VerifierPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const quota = await limiterAction("verification_jeton", 40);
  if ("error" in quota) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="shell max-w-xl py-16">
          <p className="kicker">Vérification publique</p>
          <h1 className="display mt-2">Trop de tentatives</h1>
          <p className="muted mt-4">Réessayez dans quelques minutes.</p>
        </main>
      </div>
    );
  }

  const { token } = await params;
  const jeton = await prisma.jetonVerification.findUnique({
    where: { token },
    include: {
      demande: {
        include: {
          offre: { include: { pays: true, service: true } },
          utilisateur: { include: { profil: true } },
        },
      },
    },
  });
  if (!jeton) notFound();

  const valide = jeton.statut === "valide";

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="shell max-w-xl py-16">
        <div className="reveal text-center">
          <span className={`stamp${valide ? "" : " is-bad"}`}>
            {valide ? <ShieldCheck size={32} strokeWidth={1.4} /> : <ShieldAlert size={32} strokeWidth={1.4} />}
          </span>
          <p className="kicker mt-6">Vérification publique</p>
          <h1 className="display mt-2 text-[42px] sm:text-[48px]">{valide ? "Authentique" : "Révoqué"}</h1>
        </div>
        <div className="card mt-6 p-4 sm:p-5">
          <p className="kicker">{jeton.demande.reference}</p>
          <p className="mt-2 text-[18px] font-semibold tracking-tight">{jeton.demande.offre.service.libelle}</p>
          <p className="mt-2 text-[15px] muted">
            <PaysNom code={jeton.demande.offre.codePays} libelle={jeton.demande.offre.pays.libelle} />
          </p>
          <p className="mt-3 text-sm muted">
            {jeton.demande.utilisateur.profil?.prenom} {jeton.demande.utilisateur.profil?.nom}
          </p>
          <p className="mt-6 text-sm muted">
            {valide
              ? "Ce jeton est valide. Une copie ancienne n’est plus valable s’il est révoqué."
              : "Ce jeton a été annulé. L’ancienne copie n’est plus valable."}
          </p>
        </div>
      </main>
    </div>
  );
}
