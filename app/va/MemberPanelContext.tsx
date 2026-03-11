"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type MemberPanelContextValue = {
  memberPanelOpen: boolean;
  setMemberPanelOpen: (open: boolean) => void;
  toggleMemberPanel: () => void;
};

const MemberPanelContext = createContext<MemberPanelContextValue | null>(null);

const DEFAULT_OPEN = true;

export function MemberPanelProvider({ children }: { children: ReactNode }) {
  const [memberPanelOpen, setMemberPanelOpen] = useState(DEFAULT_OPEN);
  const toggleMemberPanel = useCallback(() => setMemberPanelOpen((o) => !o), []);
  const value: MemberPanelContextValue = {
    memberPanelOpen,
    setMemberPanelOpen,
    toggleMemberPanel,
  };
  return (
    <MemberPanelContext.Provider value={value}>
      {children}
    </MemberPanelContext.Provider>
  );
}

export function useMemberPanel(): MemberPanelContextValue {
  const ctx = useContext(MemberPanelContext);
  if (!ctx) {
    return {
      memberPanelOpen: false,
      setMemberPanelOpen: () => {},
      toggleMemberPanel: () => {},
    };
  }
  return ctx;
}

export function MemberPanelToggle() {
  const { memberPanelOpen, toggleMemberPanel } = useMemberPanel();
  return (
    <button
      type="button"
      onClick={toggleMemberPanel}
      className={`va-member-panel-toggle ${memberPanelOpen ? "va-member-panel-toggle--active" : ""}`}
      aria-label={memberPanelOpen ? "Hide Member panel" : "Show Member panel"}
      aria-expanded={memberPanelOpen}
    >
      Member
    </button>
  );
}
