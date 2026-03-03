import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DirectorCreditsRedirect() {
  redirect("/director/members");
}
