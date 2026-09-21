import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint } from "@/components/Surface";
import { CreerCollaborateurForm } from "@/components/LotEquipe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { estAdministrateur } from "@/lib/espaces";

const ROLES: Record<string, string> = {
  controleur: "Contrôleur",
  administrateur: "Administrateur",
  conseiller: "Contrôleur",
  signataire: "Administrateur",
};

export default async function BureauEquipePage() {
  const session = await getSession();
  if (!session) redirect("/connexion?role=controleur");
  if (session.typeCompte !== "collaborateur") redirect("/connexion?role=controleur");
  const unread = await unreadCount(session);

  const equipe = await prisma.utilisateur.findMany({
    where: { typeCompte: "collaborateur" },
    include: { profil: true },
    orderBy: { createdAt: "asc" },
  });

  const admin = estAdministrateur(session.role);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker="Back-office"
          title="Équipe"
          text={
            admin
              ? "Créez un contrôleur ou un administrateur. Après chaque compte, un nouveau code PD s’affiche : l’ancien ne sert plus."
              : "Consultez les comptes équipe. Seul un administrateur peut inviter un collaborateur."
          }
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {admin ? (
            <section className="card p-6 sm:p-8">
              <p className="kicker">Nouveau compte</p>
              <h2 className="form-desk-title">Inviter un collaborateur</h2>
              <div className="mt-6">
                <CreerCollaborateurForm />
              </div>
            </section>
          ) : (
            <section className="card p-6 sm:p-8">
              <p className="kicker">Invitation</p>
              <h2 className="form-desk-title">Réservé à l’administrateur</h2>
              <p className="muted mt-3 text-sm">
                Un contrôleur consulte l’équipe. L’invitation d’un nouveau compte se fait par un administrateur.
              </p>
            </section>
          )}
          <section className="space-y-3">
            {equipe.length === 0 ? (
              <EmptyHint
                icon={<Users size={26} strokeWidth={1.5} />}
                title="Aucun collaborateur"
                text="Invitez le premier contrôleur depuis le formulaire."
              />
            ) : (
              equipe.map((membre) => (
                <article key={membre.id} className="card p-5">
                  <p className="kicker">{ROLES[membre.role] || membre.role || "Collaborateur"}</p>
                  <h3 className="piece-name mt-1">
                    {membre.profil?.prenom} {membre.profil?.nom}
                  </h3>
                  <p className="muted text-sm">{membre.email}</p>
                </article>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
