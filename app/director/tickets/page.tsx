import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DirectorTicketsRedirect() {
  redirect("/director/tasks");
}
