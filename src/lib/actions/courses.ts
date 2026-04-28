"use server";

import { db } from "@/lib/db";
import { courses, courseCollaborators, users } from "@/lib/db/schema";
import type { GradingConfig, GradingCategory, GradeThreshold } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCourse(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const semester = formData.get("semester") as string;

  const [course] = await db
    .insert(courses)
    .values({ name, semester, createdBy: session.user.id })
    .returning();

  await db
    .insert(courseCollaborators)
    .values({ courseId: course.id, userId: session.user.id, role: "owner" });

  redirect(`/courses/${course.id}`);
}

export async function updateCourse(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const semester = formData.get("semester") as string;

  await db
    .update(courses)
    .set({ name, semester, updatedAt: new Date() })
    .where(eq(courses.id, courseId));

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function deleteCourse(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(courseCollaborators)
    .where(eq(courseCollaborators.courseId, courseId));

  await db.delete(courses).where(eq(courses.id, courseId));

  redirect("/courses");
}

export async function addCollaborator(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const email = formData.get("email") as string;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) throw new Error("User not found");

  await db
    .insert(courseCollaborators)
    .values({ courseId, userId: user.id, role: "collaborator" });

  revalidatePath(`/courses/${courseId}`);
}

export async function removeCollaborator(
  collaboratorId: string,
  courseId: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(courseCollaborators)
    .where(eq(courseCollaborators.id, collaboratorId));

  revalidatePath(`/courses/${courseId}`);
}

export async function addIgnoredGitEmail(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const email = (formData.get("ignoredEmail") as string).trim().toLowerCase();
  if (!email) return;

  await db
    .update(courses)
    .set({
      ignoredGitEmails: sql`array_append(${courses.ignoredGitEmails}, ${email})`,
    })
    .where(eq(courses.id, courseId));

  revalidatePath(`/courses/${courseId}/edit`);
}

export async function removeIgnoredGitEmail(courseId: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(courses)
    .set({
      ignoredGitEmails: sql`array_remove(${courses.ignoredGitEmails}, ${email})`,
    })
    .where(eq(courses.id, courseId));

  revalidatePath(`/courses/${courseId}/edit`);
}

export async function addIgnoredGithubUsername(
  courseId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const username = (formData.get("ignoredGithubUsername") as string)
    .trim()
    .toLowerCase();
  if (!username) return;

  await db
    .update(courses)
    .set({
      ignoredGithubUsernames: sql`array_append(${courses.ignoredGithubUsernames}, ${username})`,
    })
    .where(eq(courses.id, courseId));

  revalidatePath(`/courses/${courseId}`);
}

export async function removeIgnoredGithubUsername(
  courseId: string,
  username: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(courses)
    .set({
      ignoredGithubUsernames: sql`array_remove(${courses.ignoredGithubUsernames}, ${username})`,
    })
    .where(eq(courses.id, courseId));

  revalidatePath(`/courses/${courseId}`);
}

async function getGradingConfig(courseId: string): Promise<GradingConfig> {
  const [course] = await db
    .select({ gradingConfig: courses.gradingConfig })
    .from(courses)
    .where(eq(courses.id, courseId));
  return course?.gradingConfig ?? { categories: [], gradeThresholds: [] };
}

async function setGradingConfig(courseId: string, config: GradingConfig) {
  await db
    .update(courses)
    .set({ gradingConfig: config, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  revalidatePath(`/courses/${courseId}`);
}

export async function addGradingCategory(
  courseId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const maxPoints = parseFloat(formData.get("maxPoints") as string);
  const perCheckpoint = formData.get("perCheckpoint") === "true";

  if (!name || isNaN(maxPoints) || maxPoints < 0) return;

  const config = await getGradingConfig(courseId);
  const newCategory: GradingCategory = {
    id: crypto.randomUUID(),
    name,
    maxPoints,
    perCheckpoint,
  };
  config.categories.push(newCategory);
  await setGradingConfig(courseId, config);
}

export async function removeGradingCategory(
  courseId: string,
  categoryId: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const config = await getGradingConfig(courseId);
  config.categories = config.categories.filter((c) => c.id !== categoryId);
  await setGradingConfig(courseId, config);
}

export async function addGradeThreshold(
  courseId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const grade = (formData.get("grade") as string).trim();
  const minPercentage = parseFloat(formData.get("minPercentage") as string);

  if (!grade || isNaN(minPercentage) || minPercentage < 0 || minPercentage > 100)
    return;

  const config = await getGradingConfig(courseId);
  // Replace if same grade label already exists
  config.gradeThresholds = config.gradeThresholds.filter(
    (t) => t.grade !== grade
  );
  const newThreshold: GradeThreshold = { grade, minPercentage };
  config.gradeThresholds.push(newThreshold);
  // Sort descending by minPercentage
  config.gradeThresholds.sort((a, b) => b.minPercentage - a.minPercentage);
  await setGradingConfig(courseId, config);
}

export async function removeGradeThreshold(
  courseId: string,
  grade: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const config = await getGradingConfig(courseId);
  config.gradeThresholds = config.gradeThresholds.filter(
    (t) => t.grade !== grade
  );
  await setGradingConfig(courseId, config);
}

export async function setCheckpointCategoryMaxPoints(
  courseId: string,
  checkpointId: string,
  categoryId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const raw = (formData.get("maxPoints") as string).trim();
  const maxPoints = raw === "" ? null : parseFloat(raw);

  const config = await getGradingConfig(courseId);
  config.checkpointOverrides ??= {};

  if (maxPoints === null || isNaN(maxPoints)) {
    // Clear override
    if (config.checkpointOverrides[checkpointId]) {
      delete config.checkpointOverrides[checkpointId][categoryId];
      if (Object.keys(config.checkpointOverrides[checkpointId]).length === 0) {
        delete config.checkpointOverrides[checkpointId];
      }
    }
  } else {
    config.checkpointOverrides[checkpointId] ??= {};
    config.checkpointOverrides[checkpointId][categoryId] = { maxPoints };
  }

  await setGradingConfig(courseId, config);
}
