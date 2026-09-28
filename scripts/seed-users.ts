import { prisma } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/password";

async function main() {
  const hash = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || "docflow-admin");
  const users = [
    { id: "user_sales", email: "sales@nafiga.co.id", name: "Sales NTS", role: "sales" },
    { id: "user_viewer", email: "viewer@nafiga.co.id", name: "Pemantau", role: "viewer" },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: hash } });
  }
  console.log("demo users ok");
  await prisma.$disconnect();
}
main();
