import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkpointLogs, checkpoints } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ checkpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { checkpointId } = await params;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const [checkpoint] = await db
    .select({ status: checkpoints.status })
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId))
    .limit(1);

  if (!checkpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const where = groupId
    ? and(
        eq(checkpointLogs.checkpointId, checkpointId),
        eq(checkpointLogs.groupId, groupId)
      )
    : eq(checkpointLogs.checkpointId, checkpointId);

  const logs = await db
    .select()
    .from(checkpointLogs)
    .where(where)
    .orderBy(asc(checkpointLogs.createdAt));

  return NextResponse.json({ status: checkpoint.status, logs });
}
