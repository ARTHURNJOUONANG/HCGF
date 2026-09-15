const NOMS: Record<string, string> = {
  FR: "France",
  DE: "Allemagne",
  BE: "Belgique",
  CA: "Canada",
};

export const PAYS_OUVERTS = [
  { code: "FR", libelle: "France" },
  { code: "DE", libelle: "Allemagne" },
  { code: "BE", libelle: "Belgique" },
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
    case "CA":
      return (
        <svg viewBox="0 0 36 24" aria-hidden>
          <rect width="36" height="24" fill="#d52b1e" />
          <rect x="9" width="18" height="24" fill="#fff" />
          <path
            fill="#d52b1e"
            d="M18 5.2 19.1 9.6l4.6-1.6-3 3.6 4.8 1.3-5.4 1.4 1.3 4.3L18 16.2l-3.4 2.4 1.3-4.3-5.4-1.4 4.8-1.3-3-3.6 4.6 1.6Z"
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
