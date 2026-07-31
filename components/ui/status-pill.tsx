import { statusStyle, type Audience } from "@/lib/status";
import type { PostStatus } from "@/types/database";

export function StatusPill({
  status,
  audience = "creator",
}: {
  status: PostStatus;
  audience?: Audience;
}) {
  const { label, bg, fg } = statusStyle(status, audience);
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}
