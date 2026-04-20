"use server";

import { db } from "@/lib/db";
import { studentGroups, students } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface CsvRow {
  nachname: string;
  vorname: string;
  idNummer: string;
  email: string;
  gruppe: string;
  gruppenwahl: string;
}

function parseCsv(text: string, delimiter: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

  const colMap = {
    nachname: headers.findIndex((h) => h === "nachname"),
    vorname: headers.findIndex((h) => h === "vorname"),
    idNummer: headers.findIndex(
      (h) => h === "id-nummer" || h === "idnummer" || h === "id"
    ),
    email: headers.findIndex(
      (h) => h === "e-mail-adresse" || h === "email" || h === "e-mail"
    ),
    gruppe: headers.findIndex((h) => h === "gruppe" || h === "group"),
    gruppenwahl: headers.findIndex((h) => h === "gruppenwahl"),
  };

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim());
    rows.push({
      nachname: colMap.nachname >= 0 ? (cols[colMap.nachname] ?? "") : "",
      vorname: colMap.vorname >= 0 ? (cols[colMap.vorname] ?? "") : "",
      idNummer: colMap.idNummer >= 0 ? (cols[colMap.idNummer] ?? "") : "",
      email: colMap.email >= 0 ? (cols[colMap.email] ?? "") : "",
      gruppe: colMap.gruppe >= 0 ? (cols[colMap.gruppe] ?? "") : "",
      gruppenwahl:
        colMap.gruppenwahl >= 0 ? (cols[colMap.gruppenwahl] ?? "") : "",
    });
  }
  return rows;
}

export async function importCsv(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const onlyWithGroup = formData.get("onlyWithGroup") === "on";
  const delimiter = (formData.get("delimiter") as string) || "\t";
  const text = await file.text();
  const rows = parseCsv(text, delimiter);

  if (rows.length === 0) throw new Error("No data rows found in CSV");

  // Filter rows
  const filtered = onlyWithGroup
    ? rows.filter((r) => r.gruppe.trim() !== "")
    : rows;

  // Group rows by "Gruppe"
  const groupMap = new Map<string, CsvRow[]>();
  for (const row of filtered) {
    const groupName = row.gruppe.trim() || "Ungrouped";
    if (!groupMap.has(groupName)) groupMap.set(groupName, []);
    groupMap.get(groupName)!.push(row);
  }

  // Create groups and students
  for (const [groupName, members] of groupMap) {
    // Check if group already exists for this course
    const existing = await db
      .select()
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.courseId, courseId),
          eq(studentGroups.name, groupName)
        )
      )
      .limit(1);

    let groupId: string;
    if (existing.length > 0) {
      groupId = existing[0].id;
    } else {
      const [newGroup] = await db
        .insert(studentGroups)
        .values({ name: groupName, courseId })
        .returning();
      groupId = newGroup.id;
    }

    for (const member of members) {
      const email = member.email.trim();
      if (!email) continue;

      // Check if student already exists in this group
      const existingStudent = await db
        .select()
        .from(students)
        .where(and(eq(students.groupId, groupId), eq(students.email, email)))
        .limit(1);

      if (existingStudent.length === 0) {
        const displayName =
          `${member.vorname} ${member.nachname}`.trim() || email;
        await db.insert(students).values({
          email,
          displayName,
          groupId,
        });
      }
    }
  }

  revalidatePath(`/courses/${courseId}`);
}
