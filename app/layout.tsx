import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Drape — Quote Studio",
  description: "Precise curtain quotations, beautifully simple.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
