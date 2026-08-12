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

const PERSONAL_EDGE_FINDER: Kit = {
  slug: "personal-edge-finder",
  title: "The Personal Edge Finder",
  blurb:
    "Answer a few honest questions and upload whatever assessments you've got. I triangulate them into a sharp positioning document that names your edge, reframes it, and hands you language you can actually use.",
  priceCents: 295,
  published: true,
  ctaLabel: "Find my edge →",
  allowUploads: {
    label: "Upload your assessments (the more, the sharper)",
    accept: [".pdf", ".png", ".jpg", ".jpeg", ".docx"],
    help: "DISC, CliftonStrengths / StrengthsFinder, Predictable Success, Enneagram, Motivators, past reviews, a resume. I triangulate everything you give me. No assessments? Your answers alone still work.",
  },
  whatsIncluded: [
    "Your edge, named as a rare combination (not just one skill)",
    "The proof: your own words and your assessments triangulated into one picture",
    "A reframe of the compliment you always get but never know how to use",
    "The honest shadow side of your edge, and what to do about it",
    "Copy-paste language: your one-liner, your 'what do you do?' answer, a positioning statement, a bio",
    "Three concrete ways to put it to work this week",
  ],
  inputFields: [
    {
      name: "ownWords",
      label: "In your own words, what do you actually do best?",
      type: "textarea",
      placeholder: "The thing you'd do even if no one paid you. Don't polish it.",
      required: true,
    },
    {
      name: "whatPeopleSay",
      label: "What do people always come to you for, or say about you?",
      type: "textarea",
      placeholder: "The 'OMG you did that' moments, or the phrase people use when they refer you.",
      required: true,
    },
    {
      name: "messFixed",
      label: "Tell me about a mess you walked into and made work.",
      type: "textarea",
      placeholder: "What was broken, and what did you actually do?",
      required: true,
    },
    {
      name: "proudWin",
      label: "A result or win you're genuinely proud of (the receipts).",
      type: "textarea",
      placeholder: "Numbers if you've got them, e.g. 'grew it from $1M to $4M.'",
      required: true,
    },
    {
      name: "capabilityTrap",
      label: "Where does your strength quietly become a trap?",
      type: "textarea",
      placeholder: "The honest downside of being the capable one.",
      required: false,
    },
    {
      name: "compliment",
      label: "A compliment you get a lot but aren't sure how to use.",
      type: "text",
      placeholder: "e.g. 'you're so fast,' 'you're so organized.'",
      required: false,
    },
    {
      name: "drivenBy",
      label: "What actually drives you?",
      type: "text",
      placeholder: "Results? Truth? Creativity? Helping? Being right? Be honest.",
      required: false,
    },
    {
      name: "knownFor",
      label: "If nothing held you back, what would you want to be known for?",
      type: "textarea",
      required: false,
    },
  ],
  playbookTemplate: `# Your Edge

(Subtitle line: "Personal Positioning for {their name}" if you know it.)

(Opening paragraph: what follows is built from their own answers and any assessments they shared. When self-report and independent assessments point at the same thing, they can stop wondering whether it is real. Adapt the source count to how many they actually provided.)

## The headline
(Name their edge as one bold, punchy statement, ideally two short lines. Then 2-3 sentences on why this particular combination is rare: most people are good at one part of the board; the fusion is the edge.)

**Your edge, in one line:** (a quotable one-liner.)

(If they gave a good phrase in their own words, add it: "In your own words, that is: ...")

## Why you can trust it
(One line: "N sources, one picture." Then a markdown table with a row for their own words and a row for EACH assessment they uploaded:)

| Source | What it says about you | The edge it points to |
|---|---|---|
| Your own words | ... | ... |

(Then a short paragraph reading the single strongest signal in the stack.)

## The reframe
(Take the surface compliment they get, e.g. "you're so fast," and show why it is a symptom, not the edge. Explain what is really happening underneath.)

**Say this instead:** (a swap-in line.)

## The honest part
(Name the shadow side of their edge, tied to something they actually said. Kind and honest: it is the flip side of the strength, not a flaw.)

**The insight that ties your edge to what you build:** (how the edge points at what they should make, sell, or protect against.)

## Language you can actually use
(Copy-paste ready, in their voice. Plain, direct, a little bold.)
- **The one-liner (parties, intros):** ...
- **When someone asks "what do you do?":** ...
- **Positioning statement (site or pitch):** ...
- **Short bio / LinkedIn headline:** ...
- **The phrase to own:** (the thing people already say when they refer you.)

## From here
(Three concrete ways to put it to work this week. Numbered.)

## The sentence to sit with
(One final, punchy summary line.)`,
  customizationPrompt: `This is the Personal Edge Finder. You produce a "Your Edge" personal positioning document, in the spirit of a sharp strategist who has read the person's answers AND every assessment they uploaded and found the one thing they all agree on.

Method:
- Triangulate. Treat the person's own answers as one source, and EACH uploaded assessment (DISC, CliftonStrengths/StrengthsFinder, Predictable Success/VOPS, Enneagram, Motivators, performance reviews, resume) as its own independent source. The power is when self-report and independent assessments point at the same thing. Say so explicitly, and adapt the "N sources" language to how many they actually provided.
- Name the edge as a rare FUSION or combination, not a single skill. Most people are good at one part; the edge is the uncommon pairing (like "sees the whole board AND builds it"). Make it specific and bold.
- Reframe the surface compliment. Find the thing people always tell them and show why it is a symptom, not the edge itself. Give them a better way to say it.
- Tell the honest part. Name the shadow of the edge, tied to their own words, kindly: it is the flip side of the strength. Then connect it to what they should build, sell, or protect against.
- Make it usable. Give copy-paste language in THEIR voice: a one-liner, a "what do you do?" answer, a positioning statement, a short bio or LinkedIn headline, and the phrase people already use to refer them.
- End with three concrete actions and a single sentence to sit with.
- Cite their actual words and their actual assessment results. Specific over generic, always. Warm, honest, a little bold. If they uploaded no assessments, work from their answers alone but note that adding assessments would sharpen it.`,
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
