import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizRunner from "./QuizRunner";

export const dynamic = "force-dynamic";

export type QuizOption = {
  id: string;
  option_text: string;
  sort_order: number;
};

export type QuizQuestion = {
  id: string;
  sort_order: number;
  question_text: string;
  question_type: "single_choice" | "multi_choice";
  options: QuizOption[];
};

export type QuizForRunner = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
};

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, title, description")
    .eq("slug", slug)
    .single();

  if (!quiz) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, sort_order, question_text, question_type")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });

  if (!questions?.length) {
    notFound();
  }

  const questionIds = questions.map((q) => q.id);
  const { data: options } = await supabase
    .from("quiz_options")
    .select("id, question_id, option_text, sort_order")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  const optionsByQuestion = new Map<string, Array<{ id: string; question_id: string; option_text: string; sort_order: number }>>();
  for (const o of options ?? []) {
    const list = optionsByQuestion.get(o.question_id) ?? [];
    list.push(o);
    optionsByQuestion.set(o.question_id, list);
  }

  const quizForRunner: QuizForRunner = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description ?? null,
    questions: questions.map((q) => ({
      id: q.id,
      sort_order: q.sort_order,
      question_text: q.question_text,
      question_type: q.question_type as "single_choice" | "multi_choice",
      options: (optionsByQuestion.get(q.id) ?? []).map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        sort_order: opt.sort_order,
      })),
    })),
  };

  const { data: existingResponse } = await supabase
    .from("quiz_responses")
    .select("answers")
    .eq("member_id", user.id)
    .eq("quiz_id", quiz.id)
    .single();

  const initialAnswers: Record<string, string | string[]> = (existingResponse?.answers as Record<string, string | string[]>) ?? {};

  return (
    <main className="app-shell">
      <h1 className="page-title">{quizForRunner.title}</h1>
      {quizForRunner.description && (
        <p className="text-gray-600 mb-4">{quizForRunner.description}</p>
      )}
      <div className="card">
        <QuizRunner
          quiz={quizForRunner}
          memberId={user.id}
          initialAnswers={initialAnswers}
        />
      </div>
    </main>
  );
}
