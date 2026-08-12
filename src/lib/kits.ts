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

export type KitUploads = {
  /** Label shown above the file input. */
  label: string;
  /** Accepted file extensions, e.g. [".pdf", ".png", ".jpg", ".docx"]. */
  accept: string[];
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
  /** When true, the kit appears in the public storefront. Default false (parked). */
  published?: boolean;
  /** When set, the customizer shows a file-upload control passed to the AI. */
  allowUploads?: KitUploads;
  /** Optional label for the generate button on the customizer. */
  ctaLabel?: string;
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
  published: false, // parked for now
};

// NOTE: the questions, methodology, and output structure below are a DRAFT.
// Swap in Chrissy's real Personal Edge framework (from her Claude session) — it's
// config only (inputFields + customizationPrompt + playbookTemplate), no code change.
const PERSONAL_EDGE_FINDER: Kit = {
  slug: "personal-edge-finder",
  title: "The Personal Edge Finder",
  blurb:
    "Answer a few honest questions (and upload any assessments you've got). I'll hand you a short, sharp document that names your personal edge, and how to actually use it.",
  priceCents: 295,
  published: true,
  ctaLabel: "Find my edge →",
  allowUploads: {
    label: "Upload any assessments you already have (optional)",
    accept: [".pdf", ".png", ".jpg", ".jpeg", ".docx"],
    help: "StrengthsFinder, Enneagram, DISC, a performance review, your resume — anything. I'll read them and factor them in.",
  },
  whatsIncluded: [
    "A punchy name for your personal edge (the thing you do that others don't)",
    "Where it comes from, pulled from your own words and assessments",
    "How it shows up in your work and life",
    "Where to point it: the roles and projects where it's a superpower",
    "A one-line edge statement you can drop in a bio or intro",
  ],
  inputFields: [
    {
      name: "whatPeopleAsk",
      label: "What do people always come to you for?",
      type: "textarea",
      placeholder: "The stuff friends, coworkers, or family text you about.",
      required: true,
    },
    {
      name: "easyForYou",
      label: "What's easy for you that others seem to find hard?",
      type: "textarea",
      placeholder: "The thing you do without thinking that makes people go 'how?'",
      required: true,
    },
    {
      name: "loseTrackOfTime",
      label: "What are you doing when you lose track of time?",
      type: "text",
      placeholder: "e.g. untangling a messy process, making something look right...",
      required: true,
    },
    {
      name: "proudOf",
      label: "What have you built or pulled off that you're weirdly proud of?",
      type: "textarea",
      placeholder: "Big or small. The thing that maybe shouldn't have worked, but did.",
      required: true,
    },
    {
      name: "complimentBrushOff",
      label: "What's a compliment you brush off but secretly love?",
      type: "text",
      required: false,
    },
    {
      name: "roles",
      label: "A few hats you've worn (jobs, roles, side projects)",
      type: "text",
      placeholder: "e.g. teacher, ops manager, made a podcast, run the PTA...",
      required: false,
    },
    {
      name: "dream",
      label: "If nothing held you back, what would you love to be known for?",
      type: "textarea",
      required: false,
    },
  ],
  playbookTemplate: `# Your Personal Edge

## Your edge, in a phrase
(Name it. One punchy, memorable line. Then 2-3 sentences on what it means for them specifically.)

## Where it comes from
(The through-line across their answers and any uploaded assessments. Cite their actual words. Why this particular combination is rare.)

## How it shows up
(3-5 concrete ways this edge plays out in their work and life.)

## Where to point it
(The roles, projects, and kinds of work where this edge is a genuine superpower. Specific and encouraging.)

## Your edge statement
(One line they can drop in a bio, intro, or pitch. Make it sound like them.)

## One thing to try this week
(A small, concrete action to lean into the edge.)`,
  customizationPrompt: `This is the Personal Edge Finder. Your job: help ONE person see their unique edge — the specific, hard-to-copy combination of strengths, instincts, and interests that makes them them. Draw on their answers AND any uploaded assessments (strengths tests, reviews, resumes, screenshots). Find the through-line: the thing that keeps showing up across everything. Name it as a punchy, memorable phrase (in the spirit of "you see how everything connects" or "you turn chaos into a plan"). Be specific and personal — quote or paraphrase their actual words; never generic horoscope fluff. Warm, honest, and encouraging: help them believe it. If they uploaded assessments, explicitly connect what those say to what they wrote. End with a one-line edge statement that sounds like them.`,
};

const KITS: Kit[] = [PERSONAL_EDGE_FINDER, NEIGHBORHOOD_CAMP];

export function getAllKits(): Kit[] {
  return KITS;
}

/** Kits shown in the public storefront. */
export function getPublishedKits(): Kit[] {
  return KITS.filter((k) => k.published);
}

export function getKit(slug: string): Kit | null {
  return KITS.find((k) => k.slug === slug) ?? null;
}

export function formatKitPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
