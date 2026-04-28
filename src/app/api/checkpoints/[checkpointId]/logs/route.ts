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
  const pipeline = searchParams.get("pipeline");
  const level = searchParams.get("level");

  const [checkpoint] = await db
    .select({ status: checkpoints.status })
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId))
    .limit(1);

  if (!checkpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const conditions = [eq(checkpointLogs.checkpointId, checkpointId)];
  if (groupId) conditions.push(eq(checkpointLogs.groupId, groupId));
  if (pipeline) conditions.push(eq(checkpointLogs.pipeline, pipeline));
  if (level) conditions.push(eq(checkpointLogs.level, level));

  const logs = await db
    .select()
    .from(checkpointLogs)
    .where(and(...conditions))
    .orderBy(asc(checkpointLogs.createdAt));

  return NextResponse.json({ status: checkpoint.status, logs });
}
