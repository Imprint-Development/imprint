import { signIn } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo: "/dashboard" });
  }

  async function signInWithCredentials(formData: FormData) {
    "use server";
    await signIn("local-credentials", {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    });
  }

  const showDevLogin = process.env.NODE_ENV === "development";

  return (
    <LoginClient
      signInWithGitHub={signInWithGitHub}
      signInWithCredentials={signInWithCredentials}
      showDevLogin={showDevLogin}
    />
  );
}
