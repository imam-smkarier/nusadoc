import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { getOrgEntitlements, summarizeEntitlements } from "@/lib/server/plan";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ent = await getOrgEntitlements(user.organizationId);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
    organization: {
      id: ent.organizationId,
      name: ent.name,
      ...summarizeEntitlements(ent),
    },
  });
}
