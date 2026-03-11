/**
 * Mom Ops VA Application Quiz: 10 questions across 5 competencies.
 * Each question is worth 0–2 points. Max score = 20.
 * Score bands: 16–20 Elite, 12–15 Strong, 8–11 Needs Training, 0–7 Not Recommended.
 */

export const VA_QUIZ_MAX_SCORE = 20;

/** Points per answer: answer letter -> points (0, 1, or 2) */
export type QuestionScoring = Record<string, number>;

/** q1..q10 scoring (answer A/B/C/D -> points) */
export const VA_QUIZ_SCORING: Record<string, QuestionScoring> = {
  q1: { C: 2, B: 1, A: 0, D: 0 },
  q2: { B: 2, A: 0, C: 1, D: 0 },
  q3: { B: 2, C: 1, A: 0, D: 0 },
  q4: { B: 2, D: 1, A: 0, C: 0 },
  q5: { B: 2, A: 1, C: 0, D: 0 },
  q6: { B: 2, A: 1, C: 0, D: 0 },
  q7: { A: 2, B: 1, C: 0, D: 0 },
  q8: { B: 2, A: 1, C: 0, D: 0 },
  q9: { B: 2, A: 1, C: 0, D: 0 },
  q10: { B: 2, A: 1, C: 0, D: 0 },
};

export type ScoreBand = "Elite Operator" | "Strong Candidate" | "Needs Training" | "Not Recommended";

export function getScoreBand(total: number): ScoreBand {
  if (total >= 16) return "Elite Operator";
  if (total >= 12) return "Strong Candidate";
  if (total >= 8) return "Needs Training";
  return "Not Recommended";
}

export function computeVaQuizScore(answers: Record<string, string>): {
  total: number;
  scorePct: number;
  details: { answers: Record<string, string>; scores: Record<string, number> };
} {
  const scores: Record<string, number> = {};
  let total = 0;
  const questionIds = Object.keys(VA_QUIZ_SCORING);
  const answersOut: Record<string, string> = {};
  for (const q of questionIds) {
    const letter = (answers[q] ?? "").trim().toUpperCase();
    const map = VA_QUIZ_SCORING[q];
    const pts = letter && map[letter] !== undefined ? map[letter] : 0;
    scores[q] = pts;
    total += pts;
    answersOut[q] = letter || "";
  }
  const scorePct = VA_QUIZ_MAX_SCORE > 0 ? Math.round((total / VA_QUIZ_MAX_SCORE) * 100) : 0;
  return { total, scorePct, details: { answers: answersOut, scores } };
}

export type VaQuizQuestion = {
  id: string;
  competency: string;
  question: string;
  options: { letter: string; text: string }[];
};

export const VA_QUIZ_QUESTIONS: VaQuizQuestion[] = [
  {
    id: "q1",
    competency: "Decision Reduction",
    question: 'A member asks: "Can you help me find a dash cam?" What is the BEST response?',
    options: [
      { letter: "A", text: "Ask what brands she prefers" },
      { letter: "B", text: "Send a list of 10 dash cams with specs" },
      { letter: "C", text: "Send 3 recommended options with pros/cons and a clear recommendation" },
      { letter: "D", text: "Tell her to check Amazon reviews" },
    ],
  },
  {
    id: "q2",
    competency: "Decision Reduction",
    question: "A mom asks for a weekly meal plan. What should your response include?",
    options: [
      { letter: "A", text: "Ask what she wants to eat" },
      { letter: "B", text: "Send 5 meals with a grocery list" },
      { letter: "C", text: "Send meal ideas only" },
      { letter: "D", text: "Send a recipe website" },
    ],
  },
  {
    id: "q3",
    competency: "Research Ability",
    question: "A member asks for the best stroller wagon. What is the best research approach?",
    options: [
      { letter: "A", text: "Choose the first result on Google" },
      { letter: "B", text: "Compare 3–5 top reviewed options from trusted sources" },
      { letter: "C", text: "Send Amazon links only" },
      { letter: "D", text: "Ask the member to research it" },
    ],
  },
  {
    id: "q4",
    competency: "Research Ability",
    question: "Which source is MOST reliable for product research?",
    options: [
      { letter: "A", text: "Random blog" },
      { letter: "B", text: "Manufacturer website + expert reviews" },
      { letter: "C", text: "TikTok videos" },
      { letter: "D", text: "Reddit comments only" },
    ],
  },
  {
    id: "q5",
    competency: "Attention to Detail",
    question: "Which message is best?",
    options: [
      { letter: "A", text: '"Here are some options let me know"' },
      { letter: "B", text: '"I found three great options. Option #1 is the easiest to install, which I recommend. Let me know if you\'d like help ordering."' },
      { letter: "C", text: '"These are products"' },
      { letter: "D", text: '"Try google"' },
    ],
  },
  {
    id: "q6",
    competency: "Attention to Detail",
    question: "A task asks for a printable packing list. What should you deliver?",
    options: [
      { letter: "A", text: "A paragraph list in email" },
      { letter: "B", text: "A formatted checklist the member can print" },
      { letter: "C", text: "A link to a packing blog" },
      { letter: "D", text: "Ask the member what format they want" },
    ],
  },
  {
    id: "q7",
    competency: "Communication Style",
    question: "Which reply matches Mom Ops voice best?",
    options: [
      { letter: "A", text: '"Hi Kristen! I found three great dash cam options for you. The first is the easiest to use, which I recommend."' },
      { letter: "B", text: '"Attached."' },
      { letter: "C", text: '"Here are links."' },
      { letter: "D", text: '"Research complete."' },
    ],
  },
  {
    id: "q8",
    competency: "Communication Style",
    question: "If you need clarification, what is best?",
    options: [
      { letter: "A", text: "Ask multiple questions immediately" },
      { letter: "B", text: "Research first, ask only what cannot be inferred" },
      { letter: "C", text: "Tell the member you cannot proceed" },
      { letter: "D", text: "Wait for the member to provide more info" },
    ],
  },
  {
    id: "q9",
    competency: "Initiative",
    question: "A mom asks for a birthday invitation. What would great work include?",
    options: [
      { letter: "A", text: "One design" },
      { letter: "B", text: "Three design options" },
      { letter: "C", text: "A Canva template link" },
      { letter: "D", text: "Ask her to design it herself" },
    ],
  },
  {
    id: "q10",
    competency: "Initiative",
    question: 'A mom asks for travel help. What is an example of "one level above"?',
    options: [
      { letter: "A", text: "Just the itinerary" },
      { letter: "B", text: "Itinerary + weather + packing suggestions" },
      { letter: "C", text: "Just flight options" },
      { letter: "D", text: "A travel blog link" },
    ],
  },
];
