import { ESPACES, type EspaceId } from "@/lib/espaces";

export function RolePicker({
  value,
  onChange,
  espaces = ESPACES,
}: {
  value: EspaceId;
  onChange: (id: EspaceId) => void;
  espaces?: readonly { id: EspaceId; label: string; texte: string }[];
}) {
  return (
    <div className="role-grid">
      {espaces.map((espace) => (
        <button
          key={espace.id}
          type="button"
          className={`role-tile${value === espace.id ? " is-on" : ""}`}
          onClick={() => onChange(espace.id)}
        >
          <span className="role-tile-label">{espace.label}</span>
          <span className="role-tile-text">{espace.texte}</span>
        </button>
      ))}
    </div>
  );
}
