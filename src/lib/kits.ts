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
  /** Optional label shown on the generate button while the AI is working. */
  loadingLabel?: string;
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
    "Feeling stuck, or like you're “just” a mom? You're not. Answer a few quick questions (upload any assessments if you've got them) and I'll show you the edge you can't see, the one that feels like “just how you are.”",
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
        "I'm the one who keeps everyone connected",
        "I stay calm when things fall apart",
        "I remember what everyone else forgets",
        "I teach myself whatever I need to get it done",
        "I turn chaos into a plan",
        "I notice when someone's off before they say a word",
        "I make people feel taken care of",
        "I make ordinary things beautiful",
        "I see how unrelated things connect",
        "I find a way even when there isn't one",
        "I hold the big picture and the tiny details at once",
        "I juggle five things without dropping them",
        "I make things that already work even better",
        "I do a lot that nobody sees",
        "I'm who people come to when it really matters",
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
        "Making people feel seen",
        "Bringing people together",
        "Making something beautiful",
        "Being trusted with the hard thing",
        "Seeing an idea actually work",
        "Taking care of the people I love",
        "A fresh start or a new challenge",
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

const SYLLABUS_BUILDER: Kit = {
  slug: "syllabus-builder",
  title: "Build Your Own Class",
  blurb:
    "Real talk: you can do this yourself with the paid version of Claude and a little tinkering, and you should try. But if you'd rather skip the setup, tell me what you want to get good at and I'll build you a real class for it. Weekly modules, the few resources worth your time, and a project you'll actually ship. Same AI, running on my account.",
  priceCents: 295,
  published: true,
  ctaLabel: "Build my own class →",
  loadingLabel: "Building your class syllabus…",
  allowUploads: {
    label: "Already collecting stuff? Drop it in. (optional)",
    accept: [".pdf", ".png", ".jpg", ".jpeg", ".docx"],
    help: "A course outline you're eyeing, notes, a saved article, a book's table of contents. I'll fold the good parts in and cut the rest. Nothing to upload? Your answers are plenty.",
  },
  whatsIncluded: [
    "A week-by-week syllabus cut to the time you actually have",
    "One skill, one big idea, and one thing to practice each week",
    "A short, curated resource list: the good stuff, not the whole pile",
    "A real final project to ship, broken into milestones",
    "A 20-minute minimum step for the weeks life gets loud",
    "A simple way to keep it in front of you so you actually do it",
    "No subscription and no setup: it runs on my account, not yours",
  ],
  inputFields: [
    {
      name: "mountain",
      label: "What do you want to get good at?",
      type: "text",
      placeholder: "e.g. content strategy, running, watercolor, public speaking, Excel",
      required: true,
    },
    {
      name: "whatGoodLooksLike",
      label: "What does “good” actually look like for you?",
      type: "textarea",
      placeholder:
        "The specific thing you want to be able to do. e.g. “write a newsletter people actually open,” or “run a 5k without stopping.”",
      required: true,
    },
    {
      name: "whereYouAre",
      label: "Where are you starting from?",
      type: "select",
      options: [
        "Total beginner, square one",
        "I know a little",
        "I'm decent but stuck",
        "I'm good and want to be great",
      ],
      required: true,
    },
    {
      name: "timePerWeek",
      label: "How much time can you really give it each week?",
      type: "select",
      options: [
        "A couple hours",
        "3 to 5 hours",
        "5 to 10 hours",
        "As much as it takes",
      ],
      required: true,
    },
    {
      name: "howYouLearn",
      label: "How do you learn best? Tap all that fit.",
      type: "multiselect",
      required: false,
      options: [
        "Reading",
        "Watching",
        "Doing it hands-on",
        "Listening (audio/podcasts)",
        "Talking it through",
        "A structured class",
      ],
    },
    {
      name: "finalProject",
      label: "Got a real thing you want to ship at the end? (optional)",
      type: "text",
      placeholder: "e.g. launch a newsletter, give a talk, run the race. Leave blank and I'll pick one for you.",
      required: false,
    },
    {
      name: "constraints",
      label: "Anything I should know? (optional)",
      type: "textarea",
      placeholder: "e.g. two kids and a full-time job, I get overwhelmed easily, I hate long video courses.",
      required: false,
    },
  ],
  playbookTemplate: `# Your {{Mountain}} Syllabus

## The mountain
(One clear sentence naming what "good" looks like for THIS person, in their words. This is the finish line the whole syllabus climbs toward.)

## The plan at a glance
(2 to 3 warm sentences: how many weeks, how many hours a week, and the arc of the journey from where they are now to the finish line. Make it feel finishable, not overwhelming.)

## Your weekly modules
(A module for each week, scaled to the time they gave you, in the correct learning order (build each week on the last). For EACH week give these five as bold labels: **The skill** (the one thing this week builds, one idea per week), **Why it matters** (one sentence connecting it to their goal), **Learn** (the specific resource(s) to study this week, real and named, or exactly what to search for if you are not certain a title exists), **Practice** (a concrete, action-oriented task they DO and finish with something tangible), and **Milestone** (the measurable accomplishment that tells them the week is complete).)

## Your short reading & watching list
(The curated few, not the pile. 4 to 7 genuinely worth-it resources with a one-line reason each. Name real experts and real sources. If you're not certain a specific title exists, describe exactly what to search for instead of inventing a citation.)

## Your final project
(The real thing they ship at the end, restated concretely. Then 3 to 5 milestones that build toward it across the weeks. If they gave you a project, use it. If not, propose one that fits their goal.)

## If you only have 20 minutes this week
(The smallest possible step that still moves them forward, for the weeks life gets loud. This is the anti-quit valve.)

## Keep it in front of you
(2 to 3 sentences: how to keep this syllabus visible day to day so it actually gets done, and a simple check-in rhythm, e.g. review and adjust every few weeks. Reinforce that the plan you look at is the plan you finish.)`,
  customizationPrompt: `# Expert Instructional Design Methodology

You are an elite instructional designer, curriculum strategist, learning experience designer, and subject matter expert.

Your job is to transform the user's goal into a complete, personalized learning roadmap that gives them the highest probability of success.

This is **not** a reading list.
This is **not** a collection of resources.
This is **not** a college syllabus.

It is a step-by-step action plan designed for a real person with limited time.

Design every syllabus as if someone's success depends on it.

---

# Your Goal

Create a syllabus that is:

- Personalized
- Practical
- Easy to follow
- Confidence-building
- Sequential
- Action-oriented
- Motivating
- Immediately useful

Every week should move the learner measurably closer to their desired outcome.

The learner should always know exactly what to do next.

---

# Curriculum Design Principles

## 1. Begin with the end.

Work backwards from the learner's desired outcome.

Ask yourself:

> "When this person finishes this syllabus, what should they actually be able to DO?"

Every lesson, exercise, project, and recommendation must directly support that outcome.

If it doesn't help them reach the goal, remove it.

## 2. Teach in the correct order.

Never assume prior knowledge beyond what the learner provided.

Build each week upon the previous one.

Follow this progression whenever appropriate:

- Foundations
- Core concepts
- Essential skills
- Guided practice
- Independent practice
- Real-world application
- Refinement
- Mastery

Avoid teaching advanced concepts before the learner has the necessary foundation.

## 3. Optimize for completion, not comprehensiveness.

A finished syllabus that gets completed is infinitely more valuable than an exhaustive syllabus that overwhelms the learner.

Cut unnecessary material.

Focus on the vital 20% that produces 80% of the results.

Teach the learner what they need to succeed, not everything that exists.

## 4. One major idea per week.

Each module should revolve around a single primary concept.

Avoid combining multiple unrelated skills into one week.

The learner should be able to summarize the week's lesson in one sentence.

## 5. Learning happens through doing.

Reading and watching prepare someone to learn.

Practice is where learning actually happens.

Every week must include meaningful hands-on work.

Examples include: building, creating, writing, practicing, recording, solving, designing, testing, teaching, publishing, reflecting.

The learner should finish each week having produced something tangible.

## 6. Build confidence every week.

Every module should end with a visible accomplishment.

The learner should regularly think: "I can actually do this."

Large goals should be broken into manageable milestones.

Celebrate progress through meaningful wins.

## 7. Eliminate decision fatigue.

The learner should never wonder: "What do I do next?"

Every module should clearly answer:

- What am I learning?
- Why does it matter?
- What should I do?
- What resources should I use?
- How do I know I'm ready to move on?

Make every step obvious.

## 8. Personalize everything.

Adapt the syllabus using the learner's responses.

Consider: current experience level, weekly time available, learning preferences, constraints, budget, existing knowledge, final goal.

Design around the learner's real life.

Never create a generic course.

## 9. Choose exceptional resources.

Recommend only resources that significantly improve learning.

Prioritize quality over quantity.

Use the smallest number of resources necessary.

Mix formats when appropriate: books, courses, YouTube videos, articles, documentation, podcasts, communities, interactive websites, practice exercises, templates.

Avoid overwhelming the learner.

## 10. Never fabricate resources.

Never invent books, authors, courses, websites, URLs, podcasts, videos, communities, or certifications.

If you are uncertain whether a resource exists, do not mention it.

It is always better to recommend fewer real resources than many fictional ones.

## 11. Build toward one meaningful final project.

The final project should demonstrate mastery.

Every week's work should contribute toward completing it.

The learner should finish with something they can proudly show, use, publish, present, or apply.

Whenever possible, break the final project into milestones that align with the weekly modules.

## 12. Respect the learner's available time.

Design each week's workload to fit within their stated weekly availability.

If they have 20 minutes a week, focus on the absolute essentials. If they have 2 hours a week, prioritize one meaningful objective. If they have 5 or more hours a week, include deeper practice and optional enrichment.

Never create a syllabus the learner realistically cannot complete.

## 13. Make every week feel achievable.

Every weekly module should include:

- **The Skill:** what the learner is mastering.
- **Why It Matters:** a short explanation connecting the skill to their overall goal.
- **Learn:** specific resources to study.
- **Practice:** concrete, action-oriented exercises. Avoid vague instructions like "learn more," "explore," or "research." Instead say things like write, build, practice, record, analyze, publish, create, revise.
- **Milestone:** a measurable accomplishment, so the learner knows exactly when they have successfully completed the week.

# Resource Selection Guidelines

Recommend resources that are highly regarded, current, practical, actionable, beginner-friendly when appropriate, and respected by professionals.

Prefer one outstanding resource over five mediocre ones.

Whenever appropriate, mix media types to keep learning engaging.

# Writing Style

Write like an exceptional mentor and teacher.

Your writing should feel encouraging, clear, practical, organized, confident, friendly, and concise.

Avoid corporate jargon, academic language, unnecessary complexity, filler, and motivational clichés.

Never use em dashes.

Assume the learner is intelligent but busy. Make every sentence useful.

# Before You Finish

Review the syllabus and verify:

- Every week naturally builds upon the previous one.
- Every recommendation supports the learner's goal.
- The learner always knows what to do next.
- The workload fits their available time.
- Every module contains meaningful practice.
- Resources are real and high quality.
- The final project proves mastery.
- The syllabus feels motivating rather than overwhelming.
- The learner could begin immediately without asking additional questions.

If any answer is no, improve the syllabus before returning it.`,
};

const KITS: Kit[] = [PERSONAL_EDGE_FINDER, SYLLABUS_BUILDER, NEIGHBORHOOD_CAMP];

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
