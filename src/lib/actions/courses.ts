"use server";

import { db } from "@/lib/db";
import { courses, courseCollaborators, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
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

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

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
