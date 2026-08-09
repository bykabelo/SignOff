import { createClient, getUser } from "@/lib/supabase/server";
import { jsonOk, jsonError, unauthorised, serverError } from "@/lib/api";
import { checkFile, IMAGE_TYPES, storageKey } from "@/lib/uploads";
import type { Profile } from "@/types/database";

/**
 * CREATOR ONLY. Upload an avatar or an agency logo.
 *
 * Both land in the `brand` bucket under the user's own id, which is what
 * the storage policies check — a creator can only write inside their own
 * folder, so the path is part of the authorisation rather than decoration.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    const form = await request.formData();
    const kind = form.get("kind");

    if (kind !== "avatar" && kind !== "logo") {
      return jsonError("Say whether this is an avatar or a logo.");
    }

    const checked = checkFile(form.get("file"), [
      ...IMAGE_TYPES,
      "image/svg+xml",
    ]);
    if (!checked.ok) return jsonError(checked.error);

    const supabase = createClient();
    const key = storageKey([user.id, kind], checked.file.name);

    const { error: uploadError } = await supabase.storage
      .from("brand")
      .upload(key, checked.file, {
        contentType: checked.file.type,
        upsert: false,
      });

    if (uploadError) return serverError("brand upload failed", uploadError);

    const {
      data: { publicUrl },
    } = supabase.storage.from("brand").getPublicUrl(key);

    // Literal shapes, not a computed key: postgrest's update type rejects an
    // index signature, and this keeps the column names checked.
    const now = new Date().toISOString();
    const patch: Partial<Profile> =
      kind === "avatar"
        ? { avatar_url: publicUrl, updated_at: now }
        : { agency_logo_url: publicUrl, updated_at: now };

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id);

    if (error) return serverError("profile image save failed", error);

    return jsonOk({ url: publicUrl });
  } catch (error) {
    return serverError("profile-image threw", error);
  }
}
