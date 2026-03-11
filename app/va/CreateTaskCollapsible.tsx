"use client";

import { useState } from "react";
import VACreateTicketForm from "./VACreateTicketForm";

type Member = { id: string; label: string; avatarUrl?: string | null };
type TaskLibraryItem = { task: string; credits: number };

type Props = {
  members: Member[];
  taskLibrary: TaskLibraryItem[];
};

export default function CreateTaskCollapsible({ members, taskLibrary }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section style={{ marginBottom: "var(--space-2xl)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          width: "100%",
          padding: 0,
          margin: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "1rem",
            height: "1rem",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          ▶
        </span>
        <h2 className="section-heading" style={{ margin: 0 }}>
          Create task
        </h2>
      </button>
      {open && (
        <>
          <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: "var(--space-sm)", marginLeft: "1.5rem" }}>
            Create a task for a member. It will be assigned to you.
          </p>
          <div className="card" style={{ marginLeft: "1.5rem" }}>
            <VACreateTicketForm members={members} taskLibrary={taskLibrary} />
          </div>
        </>
      )}
    </section>
  );
}
