import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReviewWorkspace } from "@/lib/data";
import { ReviewPage } from "@/components/review/review-page";
import { DesignReviewPage } from "@/components/review/design-review-page";

/**
 * PUBLIC. The client's review link — no account, no session.
 *
 * The token is the credential; getReviewWorkspace validates it before
 * reading anything and scopes every query to the client it resolves to.
 * An invalid token is a 404, indistinguishable from one that never existed.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const workspace = await getReviewWorkspace(params.token);

  if (!workspace) return { title: "Review — Signoff" };

  return {
    title: `${workspace.client.name} — review`,
    // Review links are unlisted by design. Keeping them out of search
    // indexes is the other half of that promise.
    robots: { index: false, follow: false },
  };
}

export default async function Review({ params }: { params: { token: string } }) {
  const workspace = await getReviewWorkspace(params.token);
  if (!workspace) notFound();

  if (workspace.mode === "design") {
    return (
      <DesignReviewPage
        client={workspace.client}
        deliverables={workspace.deliverables}
        token={params.token}
      />
    );
  }

  return (
    <ReviewPage
      client={workspace.client}
      posts={workspace.posts}
      token={params.token}
    />
  );
}
