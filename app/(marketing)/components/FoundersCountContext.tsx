"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ContextValue = {
  claimed: number;
  setClaimed: (n: number) => void;
};

const FoundersCountContext = createContext<ContextValue | null>(null);

export function FoundersCountProvider({
  initialClaimed,
  children,
}: {
  initialClaimed: number;
  children: ReactNode;
}) {
  const [claimed, setClaimed] = useState(
    typeof initialClaimed === "number" ? Math.min(50, Math.max(0, initialClaimed)) : 0
  );
  return (
    <FoundersCountContext.Provider value={{ claimed, setClaimed }}>
      {children}
    </FoundersCountContext.Provider>
  );
}

export function useFoundersCount(): number {
  const ctx = useContext(FoundersCountContext);
  if (ctx == null) {
    return 0;
  }
  return ctx.claimed;
}

export function useSetFoundersCount(): (n: number) => void {
  const ctx = useContext(FoundersCountContext);
  if (ctx == null) {
    return () => {};
  }
  return ctx.setClaimed;
}
