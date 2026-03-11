/** Human-readable labels for ticket status slugs. Use for VA dropdown, task list, and member views. */
export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  awaiting_member_approval: "You need to approve this task",
  in_progress: "In progress",
  waiting_on_member: "Waiting on member",
  completed: "Completed",
  closed: "Closed",
  reopened: "Reopened",
  cancelled_by_va: "Cancelled by you",
  cancelled_by_admin: "Cancelled by admin",
};

export function getStatusLabel(slug: string): string {
  return TICKET_STATUS_LABELS[slug] ?? slug;
}

/** All statuses shown in UpdateTicketStatus dropdown (excluding 'new' which is pre-claim). */
export const TICKET_STATUS_DROPDOWN_SLUGS = [
  "assigned",
  "awaiting_member_approval",
  "in_progress",
  "waiting_on_member",
  "completed",
  "closed",
  "cancelled_by_va",
  "cancelled_by_admin",
] as const;

/** Statuses that finalize the task and charge the member. */
export const FINAL_STATUSES = ["completed", "closed"] as const;

/** Groupings for optgroup in VA/admin status dropdown. */
export const STATUS_GROUP_ACTIVE = ["assigned", "awaiting_member_approval", "in_progress", "waiting_on_member"] as const;
export const STATUS_GROUP_DONE = ["completed", "closed"] as const;
export const STATUS_GROUP_REOPENED = ["reopened"] as const;
export const STATUS_GROUP_CANCELLED = ["cancelled_by_va", "cancelled_by_admin"] as const;
