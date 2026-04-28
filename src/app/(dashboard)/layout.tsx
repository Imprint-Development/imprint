import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { courses, courseCollaborators, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user!.id!))
    .limit(1);

  const user = {
    name: session.user?.name ?? "User",
    email: session.user?.email ?? "",
    isAdmin: dbUser?.role === "admin",
  };

  const userCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      semester: courses.semester,
    })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, session.user!.id!));

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <DashboardShell
      user={user}
      signOutAction={signOutAction}
      courses={userCourses}
    >
      {children}
    </DashboardShell>
  );
}
