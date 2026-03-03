"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CancelTaskModal from "./CancelTaskModal";

const CANCELLABLE_STATUSES = ["assigned", "in_progress"];

type Props = { ticketId: string; currentStatus: string };

export default function CancelTaskButton({ ticketId, currentStatus }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (!CANCELLABLE_STATUSES.includes(currentStatus)) return null;

  return (
    <>
      <button
        type="button"
        className="btn"
        style={{ color: "var(--color-error, #b91c1c)" }}
        onClick={() => setShowModal(true)}
      >
        Cancel Task
      </button>
      {showModal && (
        <CancelTaskModal
          ticketId={ticketId}
          onSuccess={() => router.refresh()}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
