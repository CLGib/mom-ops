import { redirect } from "next/navigation";

/**
 * Logout page: redirects to the signout API to clear the session.
 * Use ?next=/admin (or any path) to land on login with that as the next destination.
 */
export default async function LogoutPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? encodeURIComponent(params.next) : "";
  const signoutUrl = next ? `/api/auth/signout?next=${next}` : "/api/auth/signout";
  redirect(signoutUrl);
}
