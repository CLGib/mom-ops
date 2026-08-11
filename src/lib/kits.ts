/**
 * Mom Ops kit catalog. Each kit is a done-for-you playbook that AI customizes to
 * the buyer. Repo-defined for now (ship fast); a Supabase-backed catalog + admin
 * editor is a later slice.
 */

export type KitInputField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  options?: string[];
  /** If set, prefill from this profiles column. */
  profileKey?: string;
  required?: boolean;
  help?: string;
};

export type Kit = {
  slug: string;
  title: string;
  /** One-line hook for cards + checkout. */
  blurb: string;
  priceCents: number;
  whatsIncluded: string[];
  inputFields: KitInputField[];
  /** Markdown scaffold describing the structure of the finished playbook. */
  playbookTemplate: string;
  /** Extra instructions to the AI about how to tailor this specific kit. */
  customizationPrompt: string;
};

const NEIGHBORHOOD_CAMP: Kit = {
  slug: "neighborhood-camp",
  title: "The Neighborhood Camp Op",
  blurb:
    "Host an unforgettable backyard camp for the neighborhood kids. The whole playbook, schedule, and supply list, tailored to your street in minutes.",
  priceCents: 695,
  whatsIncluded: [
    "A day-by-day camp schedule you can actually run",
    "A themed activity plan (crafts, games, snacks) matched to your kids' ages",
    "A complete supply list with rough quantities and a budget estimate",
    "A parent sign-up note + a simple permission/allergy form",
    "A morning-of checklist so nothing falls through the cracks",
  ],
  inputFields: [
    {
      name: "area",
      label: "Where are you hosting?",
      type: "text",
      placeholder: "e.g. our backyard in Mobile, AL",
      profileKey: "city",
      required: true,
      help: "Neighborhood, city, or just 'our backyard'. Helps tailor weather + supply sourcing.",
    },
    {
      name: "kidsAges",
      label: "Ages of the kids coming",
      type: "text",
      placeholder: "e.g. mostly 5–8, a couple toddlers",
      required: true,
    },
    {
      name: "kidCount",
      label: "About how many kids?",
      type: "number",
      placeholder: "e.g. 12",
      required: true,
    },
    {
      name: "days",
      label: "How many days?",
      type: "select",
      options: ["1 day", "2 days", "3 days", "5 days (a full week)"],
      required: true,
    },
    {
      name: "hours",
      label: "What hours each day?",
      type: "text",
      placeholder: "e.g. 9am–12pm",
      required: true,
    },
    {
      name: "theme",
      label: "Any theme or vibe?",
      type: "text",
      placeholder: "e.g. mermaids, backyard olympics, nature explorers, or leave blank and I'll pick",
      required: false,
    },
    {
      name: "budget",
      label: "Rough budget",
      type: "text",
      placeholder: "e.g. keep it under $75",
      required: false,
    },
    {
      name: "notes",
      label: "Anything else I should know?",
      type: "textarea",
      placeholder: "e.g. one kid has a peanut allergy; no pool; we have a big shade tree",
      required: false,
    },
  ],
  playbookTemplate: `# {{Camp name}}: Your Neighborhood Camp Playbook

## The plan at a glance
(1–2 warm sentences: the theme, the vibe, who it's for, how many days/hours.)

## Daily schedule
(For EACH day, a time-blocked schedule from start to finish: arrival, 2-3 activities, snack, free play, wrap-up. Keep blocks realistic for the ages given.)

## Activities
(For each activity: what it is, why kids this age love it, what you need, and a one-line how-to. Age-appropriate. Include a rainy-day backup.)

## Snacks
(Simple, crowd-pleasing, allergy-aware snacks with quantities for the group size.)

## Supply list & budget
(A markdown table: Item | Qty | Where to get it | Est. cost. Then a total estimate. Respect the budget if given.)

## Parent sign-up note
(A short, friendly copy-paste message the host can text/email to parents.)

## Permission & allergy form
(A simple form parents fill out: child name, emergency contact, allergies/medical notes, photo OK y/n, pickup person.)

## Morning-of checklist
(A tight checklist so the host feels ready.)`,
  customizationPrompt: `This is a "Neighborhood Camp" kit. The buyer is a mom hosting a casual backyard/neighborhood day camp for local kids. This is NOT a commercial camp, so keep it scrappy, warm, and low-stress, not corporate. Scale everything to the number of kids, their ages, the number of days, and the hours given. Honor any allergy notes as hard constraints in the snacks and supply list. If no theme is given, pick a fun age-appropriate one. If a budget is given, keep the supply total under it and note swaps. Make the supply list genuinely shoppable (real item names, rough quantities). Everything should feel ready-to-run, like a friend who already did this handed over her exact plan.`,
};

const KITS: Kit[] = [NEIGHBORHOOD_CAMP];

export function getAllKits(): Kit[] {
  return KITS;
}

export function getKit(slug: string): Kit | null {
  return KITS.find((k) => k.slug === slug) ?? null;
}

export function formatKitPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
