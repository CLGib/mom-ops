import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Legacy route — the library lives at /member/helpers.
export default function ExploreTasksRedirect() {
  redirect("/member/helpers");
}
