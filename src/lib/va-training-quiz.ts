/**
 * VA Training Quiz: post-training assessment. Pass threshold 90%.
 * Questions derived from the five training sections (company values, communication, security, how to do tasks, how to grow).
 */

export const TRAINING_QUIZ_PASS_PCT = 90;

export type TrainingQuizQuestion = {
  id: string;
  question: string;
  options: { letter: string; text: string }[];
  correctLetter: string;
};

export const VA_TRAINING_QUIZ_QUESTIONS: TrainingQuizQuestion[] = [
  {
    id: "tq1",
    question: "What does 'reduce mental load' mean for your work?",
    options: [
      { letter: "A", text: "Ask the member lots of questions so they can decide" },
      { letter: "B", text: "Remove decisions and avoid adding questions; review context before asking for more" },
      { letter: "C", text: "Do only exactly what they asked, nothing more" },
      { letter: "D", text: "Send many options and let them choose" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq2",
    question: "Which best describes 'go one step beyond'?",
    options: [
      { letter: "A", text: "Do the minimum so you finish faster" },
      { letter: "B", text: "Deliver one level above the ask and anticipate the next need" },
      { letter: "C", text: "Add extra tasks they didn't request" },
      { letter: "D", text: "Ask the member what else they need" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq3",
    question: "How should you use the Email Macro library?",
    options: [
      { letter: "A", text: "Copy macros verbatim into every reply" },
      { letter: "B", text: "Use them for tone and structure; always personalize—never copy verbatim" },
      { letter: "C", text: "Ignore them and write from scratch" },
      { letter: "D", text: "Only use them for the first message" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq4",
    question: "What should you never ask for or store?",
    options: [
      { letter: "A", text: "Member's name" },
      { letter: "B", text: "Passwords" },
      { letter: "C", text: "Task details" },
      { letter: "D", text: "Preferred contact time" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq6",
    question: "Before you start a task, what should you do?",
    options: [
      { letter: "A", text: "Start immediately and ask questions later" },
      { letter: "B", text: "Open Member context to see profile, onboarding survey, and quizzes; use it to personalize" },
      { letter: "C", text: "Email the member to confirm the request" },
      { letter: "D", text: "Check only the task subject" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq7",
    question: "Before submitting work, you should ask yourself:",
    options: [
      { letter: "A", text: "Did I reduce her mental load? Did I anticipate the next need? Did I match her style?" },
      { letter: "B", text: "Did I finish before the deadline?" },
      { letter: "C", text: "Did I use a template?" },
      { letter: "D", text: "Did I send a reply?" },
    ],
    correctLetter: "A",
  },
  {
    id: "tq8",
    question: "If a request touches financial, legal, or health information, you should:",
    options: [
      { letter: "A", text: "Handle it yourself if you're confident" },
      { letter: "B", text: "Follow 'What we cannot do' guidelines and escalate when unsure" },
      { letter: "C", text: "Ask the member to get professional advice" },
      { letter: "D", text: "Ignore those parts of the request" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq9",
    question: "Mom Ops voice is best described as:",
    options: [
      { letter: "A", text: "Robotic and formal" },
      { letter: "B", text: "Warm, calm, and capable" },
      { letter: "C", text: "Very brief and minimal" },
      { letter: "D", text: "Dramatic and enthusiastic" },
    ],
    correctLetter: "B",
  },
  {
    id: "tq10",
    question: "What helps build task volume and earning potential?",
    options: [
      { letter: "A", text: "Finishing tasks as fast as possible" },
      { letter: "B", text: "Consistently high quality, 'one step beyond,' strong reviews, and repeat requests" },
      { letter: "C", text: "Taking only easy tasks" },
      { letter: "D", text: "Asking for more tasks in the chat" },
    ],
    correctLetter: "B",
  },
];

export function computeTrainingQuizScore(answers: Record<string, string>): {
  correct: number;
  total: number;
  scorePct: number;
  passed: boolean;
} {
  const total = VA_TRAINING_QUIZ_QUESTIONS.length;
  let correct = 0;
  for (const q of VA_TRAINING_QUIZ_QUESTIONS) {
    const letter = (answers[q.id] ?? "").trim().toUpperCase();
    if (letter === q.correctLetter) correct++;
  }
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = scorePct >= TRAINING_QUIZ_PASS_PCT;
  return { correct, total, scorePct, passed };
}
