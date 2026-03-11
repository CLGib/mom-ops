import { redirect } from "next/navigation";

/** VA home is the Tasks page. */
export default function VAPage() {
  redirect("/va/tasks");
}
