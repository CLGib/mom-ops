/** Quiet-window days for check-in list, `va_get_member_context_for_checkin`, and log authorization. */
export const VA_STALE_CHECKIN_DAYS = 14;

export type RecurringOutreachEventRow = {
  id: string;
  event_type: string;
  note_text: string | null;
  created_at: string;
  created_by: string;
  created_by_display_name: string | null;
};

export function parseRecurringOutreachEvents(raw: unknown): RecurringOutreachEventRow[] {
  if (!Array.isArray(raw)) return [];
  const out: RecurringOutreachEventRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.created_at !== "string" || typeof o.created_by !== "string") continue;
    out.push({
      id: o.id,
      event_type: typeof o.event_type === "string" ? o.event_type : "recurring_outreach",
      note_text: o.note_text == null || o.note_text === "" ? null : String(o.note_text),
      created_at: o.created_at,
      created_by: o.created_by,
      created_by_display_name:
        o.created_by_display_name == null || o.created_by_display_name === ""
          ? null
          : String(o.created_by_display_name),
    });
  }
  return out;
}
