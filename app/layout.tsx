import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  // Italic is loaded because it is used, not for completeness: the landing
  // hero sets "every client review" in italic serif, as does the onboarding
  // headline. Without it the browser slants the roman face instead, which
  // looks noticeably wrong at display sizes.
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Signoff — client review and approval, without the back-and-forth",
  description:
    "Share work through one link. Your client approves or comments — no login, no account. You hear about it instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
