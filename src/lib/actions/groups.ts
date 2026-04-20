"use server";

import { db } from "@/lib/db";
import {
  studentGroups,
  students,
  repositories,
  courseCollaborators,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function verifyCollaborator(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );

  if (!membership) throw new Error("Not a collaborator on this course");
  return session;
}

export async function createGroup(courseId: string, formData: FormData) {
  await verifyCollaborator(courseId);

  const name = formData.get("name") as string;

  await db.insert(studentGroups).values({ name, courseId });

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function renameGroup(
  groupId: string,
  courseId: string,
  formData: FormData
) {
  await verifyCollaborator(courseId);

  const name = formData.get("name") as string;

  await db
    .update(studentGroups)
    .set({ name })
    .where(
      and(eq(studentGroups.id, groupId), eq(studentGroups.courseId, courseId))
    );

  revalidatePath(`/courses/${courseId}/groups/${groupId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteGroup(groupId: string, courseId: string) {
  await verifyCollaborator(courseId);

  await db.delete(studentGroups).where(eq(studentGroups.id, groupId));

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function addStudent(
  groupId: string,
  courseId: string,
  formData: FormData
) {
  await verifyCollaborator(courseId);

  const email = formData.get("email") as string;
  const displayName = formData.get("displayName") as string;

  await db.insert(students).values({ email, displayName, groupId });

  revalidatePath(`/courses/${courseId}/groups/${groupId}`);
}

export async function removeStudent(studentId: string, courseId: string) {
  await verifyCollaborator(courseId);

  await db.delete(students).where(eq(students.id, studentId));

  revalidatePath(`/courses/${courseId}`);
}

export async function addRepository(
  groupId: string,
  courseId: string,
  formData: FormData
) {
  await verifyCollaborator(courseId);

  const url = formData.get("url") as string;

  await db.insert(repositories).values({ url, groupId });

  revalidatePath(`/courses/${courseId}/groups/${groupId}`);
}

export async function removeRepository(repositoryId: string, courseId: string) {
  await verifyCollaborator(courseId);

  await db.delete(repositories).where(eq(repositories.id, repositoryId));

  revalidatePath(`/courses/${courseId}`);
}
