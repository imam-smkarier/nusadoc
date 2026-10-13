import { prisma } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/password";
import { DEMO_ORG_ID, ensureDemoOrganization } from "../src/lib/server/seedDb";

async function main() {
  await ensureDemoOrganization(prisma);
  const hash = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || "docflow-admin");
  const users = [
    { id: "user_sales", email: "sales@smkarier.co.id", name: "Sales Nusadoc", role: "sales" },
    { id: "user_viewer", email: "viewer@smkarier.co.id", name: "Pemantau", role: "viewer" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, organizationId: DEMO_ORG_ID, passwordHash: hash },
    });
  }
  console.log("demo users ok");
  await prisma.$disconnect();
}
main();
