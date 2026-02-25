"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import type { QuizForRunner } from "./page";

type AnswersState = Record<string, string | string[]>;

type Props = {
  quiz: QuizForRunner;
  memberId: string;
  initialAnswers: AnswersState;
};

const SAVE_DEBOUNCE_MS = 800;

export default function QuizRunner({ quiz, memberId, initialAnswers }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>(() => initialAnswers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = quiz.questions;
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const persistProgress = useCallback(
    async (payload: AnswersState) => {
      setSaving(true);
      const supabase = createClient();
      const { error: upsertErr } = await supabase.from("quiz_responses").upsert(
        {
          member_id: memberId,
          quiz_id: quiz.id,
          status: "in_progress",
          answers: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id,quiz_id" }
      );
      if (upsertErr) setError(upsertErr.message);
      setSaving(false);
    },
    [memberId, quiz.id]
  );

  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const t = setTimeout(() => {
      persistProgress(answers);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [answers, persistProgress]);

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  }

  function handleSingleChoice(questionId: string, optionId: string) {
    setAnswer(questionId, optionId);
  }

  function handleMultiChoice(questionId: string, optionId: string, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId];
      const arr = Array.isArray(current) ? [...current] : typeof current === "string" && current ? [current] : [];
      if (checked) {
        if (!arr.includes(optionId)) arr.push(optionId);
      } else {
        const next = arr.filter((id) => id !== optionId);
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: arr };
    });
    setError(null);
  }

  async function handleFinish() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.slug}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      router.push(`/member/quizzes/${quiz.slug}/result`);
      router.refresh();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  if (!currentQuestion) {
    return (
      <p className="form-note">No questions in this quiz.</p>
    );
  }

  const currentValue = answers[currentQuestion.id];
  const canAdvance =
    currentQuestion.question_type === "single_choice"
      ? typeof currentValue === "string" && currentValue.length > 0
      : Array.isArray(currentValue) && currentValue.length > 0;

  return (
    <div className="quiz-runner">
      <div className="form-group">
        <p className="text-sm text-gray-500 mb-2">
          Question {step + 1} of {questions.length}
        </p>
        <h3 className="font-medium mb-3" style={{ fontSize: "1.1rem" }}>
          {currentQuestion.question_text}
        </h3>
        {currentQuestion.question_type === "single_choice" ? (
          <div className="space-y-2">
            {currentQuestion.options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center p-3 rounded border border-gray-200 hover:border-gray-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`q-${currentQuestion.id}`}
                  value={opt.id}
                  checked={currentValue === opt.id}
                  onChange={() => handleSingleChoice(currentQuestion.id, opt.id)}
                  className="shrink-0 m-0"
                />
                <span className="ml-3">{opt.option_text}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const selected = Array.isArray(currentValue) ? currentValue.includes(opt.id) : false;
              return (
                <label
                  key={opt.id}
                  className="flex items-center p-3 rounded border border-gray-200 hover:border-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) =>
                      handleMultiChoice(currentQuestion.id, opt.id, e.target.checked)
                    }
                    className="shrink-0 m-0"
                  />
                  <span className="ml-3">{opt.option_text}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="form-note text-red-600 mb-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
        <div>
          {saving && (
            <span className="text-sm text-gray-500">Saving progress…</span>
          )}
        </div>
        <div className="flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          ) : null}
          {!isLastStep ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canAdvance || submitting}
              onClick={handleFinish}
            >
              {submitting ? "Submitting…" : "See my result"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        <Link href="/member/profile" className="link">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
