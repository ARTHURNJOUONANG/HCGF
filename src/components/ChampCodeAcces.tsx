export function ChampCodeAcces({ obligatoire = true }: { obligatoire?: boolean }) {
  return (
    <label className="field">
      Code d’accès PD
      <input
        name="codeAcces"
        type="text"
        className="input"
        required={obligatoire}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
      />
    </label>
  );
}
