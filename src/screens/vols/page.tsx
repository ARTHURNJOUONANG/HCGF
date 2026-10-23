import Link from "next/link";
import { redirect } from "next/navigation";
import { Plane } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { euros } from "@/lib/finance";
import { libelleStatutVol } from "@/lib/catalogues";
import { JustificatifVolBtn, PayerBilletBtn } from "@/components/LotServices";

function statutEffectif(r: { statut: string; paymentRequiredBy: Date | null }) {
  if (r.statut === "HELD" && r.paymentRequiredBy && r.paymentRequiredBy.getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (r.statut === "HELD" && r.paymentRequiredBy && r.paymentRequiredBy.getTime() - Date.now() < 6 * 3600 * 1000) {
    return "EXPIRING_SOON";
  }
  return r.statut;
}

export default async function VolsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte === "collaborateur") redirect("/bureau");
  if (session.typeCompte === "partenaire") redirect("/partenaire");
  if (session.typeCompte === "delegataire") redirect("/delegue");
  const unread = await unreadCount(session);

  const reservations = await prisma.reservationVol.findMany({
    where: { idUtilisateur: session.id },
    include: { segments: { orderBy: { ordre: "asc" } }, justificatif: true, demande: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Hold / Pay Later"
          title="Mes vols"
          text="Posez un Hold, puis payez avant la date limite pour émettre le billet."
        />

        {reservations.length === 0 ? (
          <EmptyHint
            icon={<Plane size={26} strokeWidth={1.5} />}
            title="Aucune réservation"
            text="Ouvrez un dossier vol pour poser une option Hold."
            action={
              <Link href="/demandes/nouvelle" className="btn btn-primary mt-6">
                Ouvrir un dossier vol
              </Link>
            }
          />
        ) : (
          <ul className="flight-list mt-8">
            {reservations.map((r) => {
              const statut = statutEffectif(r);
              const premier = r.segments[0];
              const dernier = r.segments[r.segments.length - 1];
              return (
                <li key={r.id} className="flight-row card">
                  {premier && dernier ? (
                    <div className="flight-route">
                      <div>
                        <strong>{premier.aeroportDepart}</strong>
                        <span>{premier.depart}</span>
                      </div>
                      <i />
                      <div>
                        <strong>{dernier.aeroportArrivee}</strong>
                        <span>{dernier.arrivee}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flight-route">
                      <div>
                        <strong>PNR</strong>
                        <span>{r.bookingReference || "—"}</span>
                      </div>
                    </div>
                  )}
                  <div className="flight-meta">
                    <p className="flight-cities">PNR {r.bookingReference || "—"}</p>
                    <p className="muted text-sm">
                      {r.airlineName} · {euros(r.totalAmount)}
                    </p>
                    <span className={`pill ${statut === "TICKETED" || statut === "HELD" ? "pill-ok" : "pill-hot"}`}>
                      {libelleStatutVol(statut)}
                    </span>
                    {statut === "TICKETED" ? (
                      <p className="mt-1 text-sm font-medium">Billet émis</p>
                    ) : (
                      <p className="hold-warn">Réservation confirmée – billet non émis</p>
                    )}
                    {r.paymentRequiredBy && statut !== "TICKETED" ? (
                      <p className="muted mt-1 text-sm">
                        Limite {r.paymentRequiredBy.toLocaleString("fr-FR", { timeZone: r.timezone })} ({r.timezone})
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {r.idDemande ? (
                      <Link href={`/demandes/${r.idDemande}?onglet=vol`} className="btn btn-ghost !min-h-10">
                        Dossier
                      </Link>
                    ) : null}
                    {statut === "HELD" || statut === "EXPIRING_SOON" ? (
                      <PayerBilletBtn reservationId={r.id} />
                    ) : null}
                    {r.justificatif ? (
                      <a href={`/api/justificatif-vol/${r.id}`} className="btn btn-ghost !min-h-10">
                        Justificatif
                      </a>
                    ) : statut === "HELD" || statut === "EXPIRING_SOON" ? (
                      <JustificatifVolBtn reservationId={r.id} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
