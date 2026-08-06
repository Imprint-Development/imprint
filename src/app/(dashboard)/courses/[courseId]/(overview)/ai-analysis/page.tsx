import AiAnalysisTab from "@/app/(dashboard)/courses/[courseId]/AiAnalysisTab";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import type { AiAnalysisConfig } from "@/lib/db/schema";
import { DEFAULT_AI_SYSTEM_PROMPT } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AiAnalysisTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const config: AiAnalysisConfig =
    (course.aiAnalysisConfig as AiAnalysisConfig) ?? {
      enabled: false,
      provider: "openai" as const,
      model: "gpt-4o",
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
    };

  return (
    <AiAnalysisTab
      courseId={courseId}
      availableProviders={{
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      }}
      providerBaseUrls={{
        openai: process.env.OPENAI_BASE_URL ?? "",
        anthropic: process.env.ANTHROPIC_BASE_URL ?? "",
      }}
      config={config}
    />
  );
}
