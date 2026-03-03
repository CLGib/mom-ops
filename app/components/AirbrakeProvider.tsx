"use client";

import { Notifier } from "@airbrake/browser";
import { useEffect } from "react";
import { setAirbrake } from "@/lib/airbrake";
import { AirbrakeErrorBoundary } from "./AirbrakeErrorBoundary";

const projectId = process.env.NEXT_PUBLIC_AIRBRAKE_PROJECT_ID;
const projectKey = process.env.NEXT_PUBLIC_AIRBRAKE_PROJECT_KEY;

let notifierInstance: Notifier | null = null;

function getOrCreateNotifier(): Notifier | null {
  if (typeof window === "undefined" || !projectId || !projectKey) return null;
  if (!notifierInstance) {
    notifierInstance = new Notifier({
      projectId: Number(projectId),
      projectKey,
      environment: process.env.NODE_ENV ?? "development",
    });
    notifierInstance.addFilter((notice) => {
      // Optional: ignore noisy or known errors
      // if (notice.errors?.[0]?.message?.includes("ResizeObserver")) return null;
      return notice;
    });
  }
  return notifierInstance;
}

export function AirbrakeProvider({ children }: { children: React.ReactNode }) {
  // Set notifier synchronously so it's available when error boundary catches (useEffect runs too late)
  const airbrake = getOrCreateNotifier();
  setAirbrake(airbrake);

  useEffect(() => {
    return () => setAirbrake(null);
  }, []);

  return (
    <AirbrakeErrorBoundary>
      {children}
    </AirbrakeErrorBoundary>
  );
}
