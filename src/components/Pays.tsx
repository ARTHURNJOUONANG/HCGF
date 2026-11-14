const NOMS: Record<string, string> = {
  FR: "France",
  DE: "Allemagne",
  BE: "Belgique",
  IT: "Italie",
  CA: "Canada",
};

export const PAYS_OUVERTS = [
  { code: "FR", libelle: "France" },
  { code: "DE", libelle: "Allemagne" },
  { code: "BE", libelle: "Belgique" },
  { code: "IT", libelle: "Italie" },
  { code: "CA", libelle: "Canada" },
];

function FlagSvg({ code }: { code: string }) {
  switch (code) {
    case "FR":
      return (
        <svg viewBox="0 0 3 2" aria-hidden>
          <rect width="1" height="2" fill="#002395" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ed2939" />
        </svg>
      );
    case "DE":
      return (
        <svg viewBox="0 0 5 3" aria-hidden>
          <rect width="5" height="1" fill="#000" />
          <rect y="1" width="5" height="1" fill="#d00" />
          <rect y="2" width="5" height="1" fill="#ffce00" />
        </svg>
      );
    case "BE":
      return (
        <svg viewBox="0 0 3 2" aria-hidden>
          <rect width="1" height="2" fill="#000" />
          <rect x="1" width="1" height="2" fill="#fada5e" />
          <rect x="2" width="1" height="2" fill="#ef3340" />
        </svg>
      );
    case "IT":
      return (
        <svg viewBox="0 0 3 2" aria-hidden>
          <rect width="1" height="2" fill="#009246" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ce2b37" />
        </svg>
      );
    case "CA":
      return (
        <svg viewBox="0 0 9600 4800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width="9600" height="4800" fill="#d52b1e" />
          <rect x="2400" width="4800" height="4800" fill="#fff" />
          {/* Feuille d’érable : géométrie officielle du drapeau canadien. */}
          <path
            fill="#d52b1e"
            d="m4890 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 3 2" aria-hidden>
          <rect width="3" height="2" fill="#d2d2d7" />
        </svg>
      );
  }
}

export function Drapeau({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-3 w-[18px]" : size === "lg" ? "h-5 w-7" : "h-4 w-[22px]";
  return (
    <span className={`flag ${dim}`} title={NOMS[code] ?? code}>
      <FlagSvg code={code} />
    </span>
  );
}

export function PaysNom({
  code,
  libelle,
  size = "md",
}: {
  code: string;
  libelle?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className="pays">
      <Drapeau code={code} size={size} />
      <span>{libelle ?? NOMS[code] ?? code}</span>
    </span>
  );
}

export function PaysListe({ light = false }: { light?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${light ? "text-white/80" : ""}`}>
      {PAYS_OUVERTS.map((p) => (
        <li key={p.code} className={`pays-chip ${light ? "pays-chip-light" : ""}`}>
          <Drapeau code={p.code} />
          <span>{p.libelle}</span>
        </li>
      ))}
    </ul>
  );
}
