/**
 * Compute age in full years from a birthday string (YYYY-MM-DD).
 * Returns null if the date is invalid or in the future.
 */
export function getAgeFromBirthday(birthday: string): number | null {
  if (!birthday || typeof birthday !== "string") return null;
  const trimmed = birthday.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  if (date > today) return null;
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

type MemberContextKids = {
  household_members?: Array<{ type?: string; birthday?: string }> | null;
  kids_count?: number | null;
  kids_ages?: unknown;
};

/**
 * Derive a "Kids" display string from member context: prefer household_members (count + ages from birthdays), fallback to kids_count/kids_ages.
 */
export function deriveKidsDisplay(mc: MemberContextKids | null): string | null {
  if (!mc) return null;
  const household = mc.household_members;
  if (Array.isArray(household) && household.length > 0) {
    const kids = household.filter((m) => m?.type === "kid");
    if (kids.length > 0) {
      const ages = kids.map((k) => (k.birthday ? getAgeFromBirthday(k.birthday) : null)).filter((a): a is number => a != null);
      const ageStr = ages.length > 0 ? ` · Ages: ${ages.join(", ")}` : "";
      return `${kids.length} kid${kids.length !== 1 ? "s" : ""}${ageStr}`;
    }
  }
  if (mc.kids_count != null && mc.kids_count > 0) {
    const ages = Array.isArray(mc.kids_ages) ? (mc.kids_ages as number[]).join(", ") : "";
    return `Count: ${mc.kids_count}${ages ? ` · Ages: ${ages}` : ""}`;
  }
  if (Array.isArray(mc.kids_ages) && (mc.kids_ages as unknown[]).length > 0) {
    return `Ages: ${(mc.kids_ages as unknown[]).join(", ")}`;
  }
  return null;
}
