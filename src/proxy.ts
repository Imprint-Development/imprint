export { auth as proxy } from "@/lib/auth";
export const config = {
  matcher: [
    "/courses/:path*",
    "/checkpoints/:path*",
    "/grading/:path*",
    "/dashboard/:path*",
  ],
};
