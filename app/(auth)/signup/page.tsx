import { redirect } from "next/navigation";

/**
 * Signup has no form of its own — account creation is the first step of
 * onboarding, so this exists only to keep /signup a working, linkable URL.
 */
export default function SignupPage() {
  redirect("/onboarding");
}
