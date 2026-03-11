import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/member-by-email?email=...
 * Returns member diagnostics (role, ticket count) for support debugging.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim()?.toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Query param email is required" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const {
    data: { users },
  } = await service.auth.admin.listUsers({ perPage: 1000 });
  const authUser = users?.find((u) => u.email?.toLowerCase() === email);
  if (!authUser) {
    return NextResponse.json(
      {
        found: false,
        email,
        message: "No auth user with this email. They may need to sign up or use the correct email.",
      },
      { status: 200 }
    );
  }

  const [profileRes, userRoleRes, ticketsRes, vaProfileRes] = await Promise.all([
    service.from("profiles").select("role").eq("id", authUser.id).maybeSingle(),
    service.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle(),
    service.from("tickets").select("*", { count: "exact", head: true }).eq("member_id", authUser.id),
    service.from("va_profiles").select("onboarding_complete, training_complete").eq("user_id", authUser.id).maybeSingle(),
  ]);

  const profileRole = profileRes.data?.role ?? null;
  const userRolesRole = userRoleRes.data?.role ?? null;
  const ticketCount = ticketsRes.count ?? 0;
  const vaProfile = vaProfileRes.data;
  const vaOnboardingComplete = vaProfile?.onboarding_complete === true;
  const vaTrainingComplete = vaProfile?.training_complete === true;

  const canAccessMemberArea = userRolesRole === "member" || userRolesRole === "admin";
  const canAccessVATasks = userRolesRole === "va" || userRolesRole === "admin";
  const inMemberList = profileRes.data != null && profileRole === "member";
  const issues: string[] = [];
  if (!userRolesRole) {
    issues.push("No user_roles row — they will be redirected to /no-access and cannot see member or VA areas.");
  } else if (userRolesRole === "member") {
    issues.push("Role is 'member' — they are sent to /member, not /va. To let them access VA tasks and claim tasks, set role to 'va' (Admin → set role for this user).");
  } else if (userRolesRole !== "member" && userRolesRole !== "admin" && userRolesRole !== "va") {
    issues.push(`user_roles.role is "${userRolesRole}" — they are sent to ${userRolesRole} dashboard, not /member or /va.`);
  }
  if (canAccessVATasks && userRolesRole === "va") {
    if (!vaProfile) {
      issues.push("No va_profiles row — they need a VA profile (e.g. from VA invite/application) to use /va/tasks.");
    } else if (!vaTrainingComplete) {
      issues.push("VA training not complete — they are redirected to /va/training until training is complete; then they can see Tasks and claim.");
    } else if (!vaOnboardingComplete) {
      issues.push("VA onboarding not complete — they can see Tasks but should complete onboarding to claim.");
    }
  }
  if (inMemberList && ticketCount === 0 && canAccessMemberArea) {
    issues.push("They have 0 tasks. If they expect to see tasks, tickets may be under a different account or not created yet.");
  }

  return NextResponse.json({
    found: true,
    email: authUser.email,
    userId: authUser.id,
    profileRole,
    userRolesRole,
    ticketCount,
    inMemberList,
    canAccessMemberArea,
    canAccessVATasks,
    vaProfile: vaProfile
      ? { onboardingComplete: vaOnboardingComplete, trainingComplete: vaTrainingComplete }
      : null,
    issues: issues.length > 0 ? issues : undefined,
  });
}
