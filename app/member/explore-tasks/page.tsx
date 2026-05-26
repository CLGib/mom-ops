import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Legacy route — Playbooks portal lives at /member/playbooks.
export default function ExploreTasksRedirect() {
  redirect("/member/playbooks");
}
