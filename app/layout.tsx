import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldCore chat",
  description: "Chat with an agent powered by FieldCore.",
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
