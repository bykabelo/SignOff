import type { Metadata, Viewport } from "next";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * Marketing homepage.
 *
 * A thin server component so the page can still export metadata — the markup
 * itself is a client component, since the mode toggle, sticky-nav border and
 * scroll reveals are all stateful.
 */

export const metadata: Metadata = {
  title: "Signoff — One link for every client review",
  description:
    "A beautiful, dead-simple way for clients to review and approve your work — social posts or design projects. No logins. No confusion. Built for freelancers and small agencies.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
};

export default function Home() {
  return <LandingPage />;
}
