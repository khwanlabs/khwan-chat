import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import LoginGate from "@/components/LoginGate";

// Mono — instrument labels + all data/numbers (DESIGN.md).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Thai companion — paired with Geist for Latin (DESIGN.md).
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FieldCore chat",
  description: "Chat with an agent powered by FieldCore.",
  icons: {
    icon: "/fieldcore-favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${jetbrainsMono.variable} ${plexThai.variable}`}
    >
      <body>
        <Providers>
          <LoginGate>{children}</LoginGate>
        </Providers>
      </body>
    </html>
  );
}
