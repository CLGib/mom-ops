"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type VAMemberProfileUpdate = {
  constraints?: string | null;
  preferred_brands?: string[] | null;
  household_members?: { type: string; name?: string; likes?: string; dislikes?: string; birthday?: string; clothing_size?: string; relation?: string }[] | null;
  important_dates?: { label: string; date: string; recurrence?: string }[] | null;
  communication_tone?: "warm" | "direct" | "formal" | null;
  kids_count?: number | null;
  kids_ages?: number[] | null;
  partner_name?: string | null;
  schools?: { name: string; city?: string; notes?: string }[] | null;
  activities?: { name: string; schedule?: string; notes?: string }[] | null;
  preferred_stores?: string[] | null;
  task_submission_preference?: "email" | "portal" | "either" | null;
  typical_turnaround?: "standard" | "rush_when_possible" | null;
  custom_field_values?: Record<string, string | number | null> | null;
};

/** VA updates member profile (context learned in communication). Caller must be VA assigned to a ticket for this member. */
export async function updateMemberProfileFromVA(
  memberId: string,
  ticketId: string,
  updates: VAMemberProfileUpdate
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("member_id, assigned_va_id")
    .eq("id", ticketId)
    .single();
  if (!ticket || ticket.assigned_va_id !== user.id || ticket.member_id !== memberId) {
    return { error: "Not authorized to update this member." };
  }

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (roleRow?.role !== "va") return { error: "Only VAs can update member profile from context." };

  const payload: Record<string, unknown> = {};
  if (updates.constraints !== undefined) payload.constraints = updates.constraints;
  if (updates.preferred_brands !== undefined) payload.preferred_brands = updates.preferred_brands;
  if (updates.household_members !== undefined) payload.household_members = updates.household_members;
  if (updates.important_dates !== undefined) payload.important_dates = updates.important_dates;
  if (updates.communication_tone !== undefined) payload.communication_tone = updates.communication_tone;
  if (updates.kids_count !== undefined) payload.kids_count = updates.kids_count;
  if (updates.kids_ages !== undefined) payload.kids_ages = updates.kids_ages;
  if (updates.partner_name !== undefined) payload.partner_name = updates.partner_name;
  if (updates.schools !== undefined) payload.schools = updates.schools;
  if (updates.activities !== undefined) payload.activities = updates.activities;
  if (updates.preferred_stores !== undefined) payload.preferred_stores = updates.preferred_stores;
  if (updates.task_submission_preference !== undefined) payload.task_submission_preference = updates.task_submission_preference;
  if (updates.typical_turnaround !== undefined) payload.typical_turnaround = updates.typical_turnaround;
  if (updates.custom_field_values !== undefined) payload.custom_field_values = updates.custom_field_values;

  if (Object.keys(payload).length === 0) return { error: null };

  const { error } = await supabase.from("profiles").update(payload).eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/va/${ticketId}`);
  revalidatePath(`/va/${ticketId}/member-context`);
  return { error: null };
}

export type VAMemberNoteRow = { id: string; note_text: string; created_at: string };

/** Fetch VA notes for this member (only this VA's notes). */
export async function getVAMemberNotes(memberId: string, ticketId: string): Promise<{ notes: VAMemberNoteRow[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notes: [], error: "Not logged in." };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("member_id, assigned_va_id")
    .eq("id", ticketId)
    .single();
  if (!ticket || ticket.assigned_va_id !== user.id || ticket.member_id !== memberId) {
    return { notes: [], error: "Not authorized." };
  }

  const { data: notes, error } = await supabase
    .from("va_member_notes")
    .select("id, note_text, created_at")
    .eq("va_id", user.id)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) return { notes: [], error: error.message };
  return {
    notes: (notes ?? []).map((n) => ({ id: n.id, note_text: n.note_text, created_at: n.created_at })),
    error: null,
  };
}

/** VA adds a note about the member (only VAs can see). */
export async function addVAMemberNote(
  memberId: string,
  ticketId: string,
  noteText: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("member_id, assigned_va_id")
    .eq("id", ticketId)
    .single();
  if (!ticket || ticket.assigned_va_id !== user.id || ticket.member_id !== memberId) {
    return { error: "Not authorized to add notes for this member." };
  }

  const trimmed = noteText.trim();
  if (!trimmed) return { error: "Note cannot be empty." };

  const { error } = await supabase.from("va_member_notes").insert({
    va_id: user.id,
    member_id: memberId,
    note_text: trimmed,
  });
  if (error) return { error: error.message };
  revalidatePath(`/va/${ticketId}/member-context`);
  return { error: null };
}
