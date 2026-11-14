import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export async function unreadCount(user: SessionUser) {
  return prisma.notification.count({
    where: { idUtilisateur: user.id, statut: "non_lue" },
  });
}
