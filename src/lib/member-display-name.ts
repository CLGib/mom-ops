/**
 * Returns only the first name (first word) from a display name to hide last name in public contexts.
 * e.g. "John Smith" -> "John", "Jane" -> "Jane"
 */
export function getFirstNameOnly(name: string | null | undefined): string {
  const s = name?.trim();
  if (!s) return "Anonymous";
  const first = s.split(/\s+/)[0];
  return first || "Anonymous";
}

/**
 * Name used for {{member-name}} in email macros: preferred name if set, otherwise first name (first word of full_name).
 */
export function getMemberDisplayNameForMacro(
  preferredName: string | null | undefined,
  fullName: string | null | undefined
): string {
  const preferred = preferredName?.trim();
  if (preferred) return preferred;
  const full = fullName?.trim();
  if (!full) return "Member";
  const first = full.split(/\s+/)[0];
  return first || "Member";
}
