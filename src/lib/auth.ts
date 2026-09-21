import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { prisma } from "./prisma";
import { normaliserRoleCollaborateur } from "./espaces";

const COOKIE = "avi_session";
const DUREE_JOURS = 14;
const DUREE_S = DUREE_JOURS * 24 * 60 * 60;
const MAX_ECHECS = 5;
const VERROU_MS = 15 * 60 * 1000;
const FENETRE_IP_MS = 15 * 60 * 1000;
const MAX_ECHECS_IP = 20;

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw === "avi-dev-secret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET est obligatoire en production.");
    }
  }
  return new TextEncoder().encode(raw ?? "avi-dev-secret-change-in-production-2026");
}

export type SessionUser = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  typeCompte: string;
  role: string;
};

export function validerEmail(email: string) {
  const valeur = email.trim().toLowerCase();
  if (valeur.length < 5 || valeur.length > 180) return "Indiquez un e-mail valide.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)) return "Indiquez un e-mail valide.";
  return null;
}

export function validerMotDePasse(password: string) {
  if (password.length < 10) {
    return "Le mot de passe doit contenir au moins 10 caractères.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  const faibles = ["password", "motdepasse", "azertyuiop", "1234567890", "demo2026!"];
  if (faibles.includes(password.toLowerCase())) {
    return "Choisissez un mot de passe plus difficile à deviner.";
  }
  return null;
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

async function contexteRequete() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, userAgent };
}

export async function limiterAction(type: string, max: number, fenetreMs = FENETRE_IP_MS) {
  const { ip } = await contexteRequete();
  const depuis = new Date(Date.now() - fenetreMs);
  const n = await prisma.evenementAuth.count({
    where: { ip, type, createdAt: { gte: depuis } },
  });
  if (n >= max) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  await prisma.evenementAuth.create({ data: { email: type, type, ip } });
  return { ok: true as const };
}

export async function sidCourant(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

function versSessionUser(user: {
  id: string;
  email: string;
  typeCompte: string;
  role: string;
  profil: { nom: string; prenom: string } | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    nom: user.profil?.nom ?? "",
    prenom: user.profil?.prenom ?? "",
    typeCompte: user.typeCompte,
    role: user.typeCompte === "collaborateur" ? normaliserRoleCollaborateur(user.role) : user.role,
  };
}

export async function createSession(user: SessionUser) {
  await prisma.sessionAuth.deleteMany({ where: { expireAt: { lt: new Date() } } });
  const { ip, userAgent } = await contexteRequete();
  const row = await prisma.sessionAuth.create({
    data: {
      idUtilisateur: user.id,
      expireAt: new Date(Date.now() + DUREE_S * 1000),
      ip,
      userAgent,
    },
  });

  const token = await new SignJWT({ sid: row.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JOURS}d`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_S,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function revoquerSessions(idUtilisateur: string) {
  await prisma.sessionAuth.updateMany({
    where: { idUtilisateur, revoqueeAt: null },
    data: { revoqueeAt: new Date() },
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      const sid = typeof payload.sid === "string" ? payload.sid : null;
      if (sid) {
        await prisma.sessionAuth.updateMany({
          where: { id: sid, revoqueeAt: null },
          data: { revoqueeAt: new Date() },
        });
      }
    } catch {
      /* cookie déjà invalide */
    }
  }
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = typeof payload.sid === "string" ? payload.sid : null;
    if (!sid) return null;

    const row = await prisma.sessionAuth.findUnique({
      where: { id: sid },
      include: { utilisateur: { include: { profil: true } } },
    });
    if (!row || row.revoqueeAt || row.expireAt.getTime() <= Date.now()) return null;
    if (row.utilisateur.statut !== "actif") return null;
    return versSessionUser(row.utilisateur);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.utilisateur.findUnique({
    where: { id: session.id },
    include: { profil: true },
  });
  if (!user || user.statut !== "actif") return null;
  return user;
}

export function accueilPour(user: { typeCompte: string }) {
  if (user.typeCompte === "collaborateur") return "/bureau";
  if (user.typeCompte === "partenaire") return "/partenaire";
  if (user.typeCompte === "delegataire") return "/delegue";
  return "/tableau-de-bord";
}

export async function tenterConnexion(email: string, password: string) {
  const { ip } = await contexteRequete();
  const depuis = new Date(Date.now() - FENETRE_IP_MS);
  const saturations = await prisma.evenementAuth.count({
    where: { ip, type: "echec", createdAt: { gte: depuis } },
  });
  if (saturations >= MAX_ECHECS_IP) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const user = await prisma.utilisateur.findUnique({
    where: { email },
    include: { profil: true },
  });

  if (user?.verrouilleJusqua && user.verrouilleJusqua.getTime() > Date.now()) {
    await prisma.evenementAuth.create({
      data: { idUtilisateur: user.id, email, type: "verrouillage", ip },
    });
    return { error: "Compte temporairement verrouillé. Réessayez dans 15 minutes." };
  }

  const ok = user ? await verifyPassword(password, user.motDePasseHash) : false;
  if (!user || !ok) {
    if (user) {
      const echecs = user.echecsConnexion + 1;
      await prisma.utilisateur.update({
        where: { id: user.id },
        data: {
          echecsConnexion: echecs,
          verrouilleJusqua: echecs >= MAX_ECHECS ? new Date(Date.now() + VERROU_MS) : null,
        },
      });
    }
    await prisma.evenementAuth.create({
      data: { idUtilisateur: user?.id ?? null, email, type: "echec", ip },
    });
    return { error: "E-mail ou mot de passe incorrect." };
  }

  if (user.statut !== "actif") {
    await prisma.evenementAuth.create({
      data: { idUtilisateur: user.id, email, type: "inactif", ip },
    });
    return { error: "Ce compte n’est plus actif." };
  }

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { echecsConnexion: 0, verrouilleJusqua: null },
  });

  const sessionUser = versSessionUser(user);
  return { ok: true as const, user: sessionUser };
}
