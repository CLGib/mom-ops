/**
 * Auto-fill task description template with member profile data when possible.
 * Template lines are like "Child's name: \n" or "Location: " — we append known values after the colon.
 */

export type ProfileForTemplate = {
  preferred_name?: string | null;
  full_name?: string | null;
  city?: string | null;
  state?: string | null;
  timezone?: string | null;
  partner_name?: string | null;
  kids_count?: number | null;
  kids_ages?: unknown; // jsonb array or object
  household_members?: Array<{
    type?: string;
    name?: string;
    birthday?: string;
    relation?: string;
  }> | null;
  diet_notes?: string | null;
};

/** Normalize a label for matching (lowercase, collapse spaces, remove punctuation) */
function norm(label: string): string {
  return label
    .toLowerCase()
    .replace(/[:\s]+/g, " ")
    .trim();
}

/** Build a map of normalized label patterns to value from profile */
function buildValueMap(profile: ProfileForTemplate): Map<string, string> {
  const m = new Map<string, string>();

  const name = profile.preferred_name?.trim() || profile.full_name?.trim();
  if (name) {
    m.set("family name", name);
    m.set("member name", name);
    m.set("your name", name);
    m.set("preferred name", name);
    m.set("honoree name", name);
    m.set("recipient name", name);
    m.set("baby's name", name); // might override with first kid below
    m.set("child's name", name);
  }

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  if (location) {
    m.set("location", location);
    m.set("city", profile.city?.trim() ?? "");
    m.set("state", profile.state?.trim() ?? "");
    m.set("location/zip code", location);
    m.set("location zip code", location);
    m.set("city/neighborhood", profile.city?.trim() ?? "");
    m.set("destination", profile.city?.trim() ?? ""); // weak match
  }

  if (profile.partner_name?.trim()) {
    m.set("partner", profile.partner_name.trim());
    m.set("spouse", profile.partner_name.trim());
  }

  if (profile.kids_count != null && profile.kids_count > 0) {
    const count = String(profile.kids_count);
    m.set("number of guests", count);
    m.set("number of children", count);
    m.set("kids count", count);
    m.set("child's age", count); // weak
    m.set("ages of children", count);
  }

  const household = profile.household_members;
  if (Array.isArray(household) && household.length > 0) {
    const firstKid = household.find((h) => h?.type === "kid" || h?.relation === "child");
    const kidName = firstKid?.name?.trim();
    if (kidName) {
      m.set("child's name", kidName);
      m.set("child name", kidName);
      m.set("baby's name", kidName);
    }
    const kidNames = household.filter((h) => h?.name?.trim()).map((h) => h!.name!.trim());
    if (kidNames.length > 0) {
      m.set("list names", kidNames.join(", "));
      m.set("names and ages", kidNames.join(", "));
    }
  }

  if (profile.timezone?.trim()) {
    m.set("timezone", profile.timezone.trim());
  }

  if (profile.diet_notes?.trim()) {
    m.set("dietary restrictions", profile.diet_notes.trim());
    m.set("dietary restrictions or allergies", profile.diet_notes.trim());
    m.set("dietary needs", profile.diet_notes.trim());
  }

  return m;
}

/** Find value for a line label; check exact norm and substrings */
function findValue(normLabel: string, valueMap: Map<string, string>): string | null {
  if (valueMap.has(normLabel)) return valueMap.get(normLabel)!;
  for (const [key, value] of valueMap) {
    if (normLabel.includes(key) || key.includes(normLabel)) return value;
  }
  return null;
}

/**
 * Fill template with profile data where possible.
 * Lines like "Child's name: \n" become "Child's name: Emma\n" when we have a matching value.
 */
export function fillTaskTemplate(
  template: string,
  profile: ProfileForTemplate | null
): string {
  if (!template?.trim() || !profile) return template;

  const valueMap = buildValueMap(profile);
  if (valueMap.size === 0) return template;

  const lines = template.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?):\s*$/);
    if (match) {
      const label = match[1].trim();
      const normLabel = norm(label);
      const value = findValue(normLabel, valueMap);
      if (value) {
        out.push(`${label}: ${value}`);
        continue;
      }
    }
    out.push(line);
  }

  return out.join("\n");
}
