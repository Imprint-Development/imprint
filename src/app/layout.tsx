import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprint",
  description:
    "Analyze student contributions in Software Engineering courses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
