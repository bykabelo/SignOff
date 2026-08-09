"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

/**
 * Set or clear a project's estimated completion date.
 *
 * The only field on the progress tracker that is not derived from the
 * deliverables themselves, so it is the only one that needs writing.
 * RLS scopes the update to the caller's own client.
 */
export async function setTargetDate(
  clientId: string,
  date: string | null,
): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const value = date?.trim() || null;

  // A date input yields YYYY-MM-DD; reject anything else rather than
  // handing Postgres a string it will refuse.
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: "That date doesn't look right." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ target_date: value })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}
