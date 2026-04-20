import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = {
    name: session.user?.name ?? "User",
    email: session.user?.email ?? "",
  };

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <CssVarsProvider>
      <CssBaseline />
      <DashboardShell user={user} signOutAction={signOutAction}>
        {children}
      </DashboardShell>
    </CssVarsProvider>
  );
}
