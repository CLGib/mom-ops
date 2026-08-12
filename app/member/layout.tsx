import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The old Mom Ops 1.0 task portal ("My Ops Hub") is retired. Everything routes to
// the new content-brand "My Stuff" library so no one lands on the task dashboard.
// (The old /member/* page code still exists but is never rendered.)
export default function MemberLayout() {
  redirect("/my-stuff");
}
