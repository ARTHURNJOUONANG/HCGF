import { describe, expect, it } from "vitest";
import { validerEmail, validerMotDePasse } from "@/lib/auth";
import { espaceParId, estAdministrateur, normaliserRoleCollaborateur, roleExigeCode } from "@/lib/espaces";

describe("validerEmail", () => {
  it("accepte une adresse valide, insensible à la casse et aux espaces", () => {
    expect(validerEmail("  Jean.Dupont@Exemple.fr ")).toBeNull();
  });
  it.each(["", "a@b", "sans-arobase.fr", "deux@@exemple.fr", `${"x".repeat(180)}@exemple.fr`])("refuse %s", (email) => {
    expect(validerEmail(email)).not.toBeNull();
  });
});

describe("validerMotDePasse", () => {
  it("exige 10 caractères, une lettre et un chiffre", () => {
    expect(validerMotDePasse("court1")).not.toBeNull();
    expect(validerMotDePasse("seulementdeslettres")).not.toBeNull();
    expect(validerMotDePasse("1234567890123")).not.toBeNull();
    expect(validerMotDePasse("Horizon2026x")).toBeNull();
  });
  it("refuse les mots de passe connus, dont celui de la démo", () => {
    expect(validerMotDePasse("Demo2026!")).not.toBeNull();
    expect(validerMotDePasse("motdepasse")).not.toBeNull();
  });
});

describe("espaces et rôles", () => {
  it("convertit les anciens rôles conseiller/signataire", () => {
    expect(normaliserRoleCollaborateur("conseiller")).toBe("controleur");
    expect(normaliserRoleCollaborateur("signataire")).toBe("administrateur");
    expect(estAdministrateur("signataire")).toBe(true);
    expect(estAdministrateur("controleur")).toBe(false);
  });
  it("retombe sur l’espace candidat pour un identifiant inconnu", () => {
    expect(espaceParId("pirate").id).toBe("candidat");
    expect(espaceParId(undefined).id).toBe("candidat");
    expect(espaceParId("signataire").id).toBe("administrateur");
  });
  it("exige le code PD pour l’équipe uniquement", () => {
    expect(roleExigeCode("controleur")).toBe(true);
    expect(roleExigeCode("administrateur")).toBe(true);
    expect(roleExigeCode("candidat")).toBe(false);
  });
});
