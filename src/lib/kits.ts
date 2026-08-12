/**
 * Mom Ops kit catalog. Each kit is a done-for-you playbook that AI customizes to
 * the buyer. Repo-defined for now (ship fast); a Supabase-backed catalog + admin
 * editor is a later slice.
 */

export type KitInputField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect";
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
      name: "soundLikeYou",
      label: "Which of these sound like you? Tap all that fit.",
      type: "multiselect",
      required: true,
      options: [
        "People come to me to “figure it out”",
        "I teach myself whatever I need to get it done",
        "I make things from scratch",
        "I turn chaos into a plan",
        "I move way faster than most people",
        "I'm fine working with no playbook",
        "I see how unrelated things connect",
        "I'd rather build it than talk about it",
        "I spot what's broken before other people do",
        "I hold the big picture and the tiny details at once",
        "I get restless when things are too settled",
        "I make things that already work even better",
      ],
    },
    {
      name: "lightsYouUp",
      label: "And what lights you up? Tap all that fit.",
      type: "multiselect",
      required: false,
      options: [
        "Solving a hard problem",
        "Making something tangible",
        "Learning something new",
        "Bringing order to a mess",
        "Getting someone unstuck",
        "Launching something",
        "Being trusted with the hard thing",
        "A real, provable result",
        "Figuring out new tech or tools",
        "Connecting people or ideas",
      ],
    },
    {
      name: "proudWin",
      label: "Tell me about something you pulled off that you're proud of.",
      type: "textarea",
      placeholder: "Big or small. Numbers if you've got them (e.g. 'grew it from $1M to $4M').",
      required: true,
    },
    {
      name: "whatPeopleAsk",
      label: "What do people always come to you for? (optional)",
      type: "textarea",
      placeholder: "The thing friends or coworkers text you about.",
      required: false,
    },
    {
      name: "capabilityTrap",
      label: "Where does being “the capable one” become a trap? (optional)",
      type: "textarea",
      placeholder: "The honest downside of being the person who can handle anything.",
      required: false,
    },
  ],
  playbookTemplate: `# Your Personal Edge

## {A memorable edge name}
(Distinctive, intuitive, easy to remember, grounded in the evidence. Not corporate, not generic personality-test language. Create the name that best fits THIS person, do not default to examples.)

**Your edge in one sentence:** (One powerful, specific sentence. Inspiration: "You have an unusual ability to [do X] by combining [strength A] + [strength B] + [strength C], especially when [specific condition].")

## What you're actually unusually good at
(2 to 4 paragraphs explaining the deeper pattern. Do not simply list traits. Describe the operating mechanism: what they are actually doing that other people may not be.)

## The pattern underneath your answers
(Fill this chain in specifically for the person: You encounter ... then You instinctively ... then You learn ... then You build or solve ... then You produce ... then Others experience ...)

## The evidence
(3 to 5 specific pieces of evidence from their answers. Do not just repeat their answers, explain why each one PROVES the edge.)
1. ...
2. ...
3. ...

## What other people see that you may not
(The gap between how they experience themselves and how others likely experience them. What feels ordinary to them but is actually unusual.)

## Your hidden advantage
(The capability underneath the obvious strengths, something they may not have named themselves.)

## Where your edge becomes a trap
(The shadow side. Explain the mechanism, do not moralize or diagnose. What happens when they overuse the edge.)

**The thing to watch:** (the specific pattern)
**The counter-skill:** (the specific skill or behavior that turns the edge from a superpower into leverage)

## Where your edge compounds
(The problems, projects, teams, and environments where this person is unusually effective, and the conditions under which the edge compounds. Also name environments that may drain or constrain them.)

## What you should stop underestimating
(3 specific things they are likely undervaluing about themselves.)
1. ...
2. ...
3. ...

## Your edge, distilled
You are the person who (finish this specifically).

(Then a 2 to 3 sentence version they could actually use to describe themselves to someone else.)`,
  customizationPrompt: `You are an expert in strengths psychology, behavioral pattern recognition, career strategy, and personal positioning. Your job is NOT to summarize the person's answers. Your job is to identify the personal edge hiding underneath them.

A personal edge is the unusual combination of strengths, instincts, behaviors, motivations, and learned capabilities that makes someone particularly effective in ways that may feel ordinary or automatic to them. The best edges are often things the person does not recognize as special, because they experience them as "just how I operate."

WHAT TO UNCOVER. Analyze the person's answers and any uploaded assessments to determine: (1) what they are naturally exceptional at; (2) what they consistently do faster, better, or differently than others; (3) what others reliably recognize in them; (4) what kinds of problems they instinctively know how to solve; (5) what patterns appear across seemingly unrelated examples; (6) what they have learned unusually quickly; (7) what combination of strengths makes them distinctive; (8) where their greatest strength becomes a liability; (9) what they are likely underestimating about themselves; (10) what kind of work, role, project, or environment allows their edge to compound. Do not stop at obvious traits like "organized," "creative," "fast learner," or "good at problem solving." Those are inputs. Find the underlying pattern. The exact language must come from the evidence. Do not force any example onto the person.

STEP 1, EXTRACT THE EVIDENCE. Privately analyze every answer and any uploads for: natural strengths (what is instinctive or unusually easy), repeated behaviors (across different contexts), external validation (what others notice, praise, ask them to do, rely on them for), speed (where they move unusually quickly), learning velocity (what they learned rapidly when needed), problem-solving style (how they behave with no obvious answer or playbook), creative pattern (how creativity and execution interact), motivation (what energizes or satisfies them), shadow side (where the same strength creates problems), and evidence of impact (concrete results and accomplishments). A single anecdote is interesting; repeated behavior is evidence.

STEP 2, TRIANGULATE. If assessments are provided, do not treat them as separate personality reports. Triangulate them against lived experience: what the person says about themselves, what others say, what their behavior demonstrates, what their accomplishments prove, what assessments suggest, and what their frustrations reveal. When these converge, confidence increases. When they conflict, do not force agreement: explain the tension and whether it reveals how the person operates. If no assessments are provided, the answers alone are sufficient. Do not penalize the analysis for missing assessments.

STEP 3, SEPARATE STRENGTHS FROM THE EDGE. A strength is "I am good at organizing." An edge is "I can rapidly turn ambiguous, messy situations into organized experiences people can actually execute." Find the combination, not the individual traits. Look especially for unexpected combinations: creativity plus operational execution, speed plus quality, curiosity plus self-teaching, strategy plus hands-on execution, organization plus improvisation, people skills plus systems thinking, vision plus resourcefulness, analytical thinking plus creative production. The edge should be specific enough that the person recognizes themselves in it.

STEP 4, FIND THE HOW. Do not just describe what they accomplish; describe their operating mechanism, what they are actually doing that others may not be. Too generic: "you are resourceful." Better: "you do not interpret a lack of knowledge as a reason to stop, you immediately start learning the missing piece."

STEP 5, NAME THE EDGE. Give it a memorable, distinctive, intuitive name grounded in the evidence. Then one powerful sentence: an unusual ability to do X by combining strength A plus strength B plus strength C, especially when a specific condition holds.

STEP 6, FIND THE RECEIPTS. Support the edge with 3 to 5 specific pieces of evidence from their answers. Do not just repeat their answers; explain why each proves the edge.

STEP 7, FIND THE SHADOW. Every meaningful edge has a downside. Identify where the strength becomes a trap. Do not moralize or diagnose; explain the mechanism. Then name what happens when they overuse the edge, and the counter-skill that turns the edge into leverage.

STEP 8, IDENTIFY THE TERRAIN. Describe environments where they thrive (some mix of ambiguity, autonomy, building, problem solving, learning, creativity, ownership, speed, variety, making something tangible, improving broken things) and environments that may drain or constrain them. Do not recommend careers because they "match their personality"; describe the conditions under which their edge compounds.

IMPORTANT RULES. Do not flatter the person to make the result feel good. Do not use generic personality-test language unless backed by evidence. Do not simply repeat their adjectives. Do not make unsupported claims. Do not confuse competence with edge. Do not treat every answer as equally important; prioritize repeated patterns, external validation, and demonstrated results. Look for contradictions, they may hold the most interesting insight. Pay particular attention to what the person does without being asked, what people repeatedly ask them for help with, what they can do fast, what they teach themselves, and what they can make work without a playbook. Treat the trap as a clue to the strength, not a separate flaw. The final insight should be specific enough that the person thinks: "I have never heard someone describe me that way, but that is exactly what I do." The goal is not to give the person a compliment; it is to give them a new operating-level understanding of themselves.`,
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
