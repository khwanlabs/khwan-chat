import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khwan Chat Sample",
  description:
    "A minimal, unbranded chat app built on the @khwan/client TypeScript library.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
