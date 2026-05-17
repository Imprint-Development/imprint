import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [setting] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "privateModeEnabled"))
    .limit(1);

  return NextResponse.json({
    privateModeEnabled: setting?.value === true || setting?.value === "true",
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { privateModeEnabled } = body as { privateModeEnabled?: boolean };

  if (typeof privateModeEnabled !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  await db
    .insert(systemSettings)
    .values({ key: "privateModeEnabled", value: privateModeEnabled })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: privateModeEnabled },
    });

  return NextResponse.json({ success: true, privateModeEnabled });
}
