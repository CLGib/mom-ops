"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReassignTaskModal from "./ReassignTaskModal";

const REASSIGNABLE_STATUSES = ["assigned", "in_progress"];

type Props = {
  ticketId: string;
  currentStatus: string;
  /** When true (default), redirect to /va on success. When false, refresh the page (e.g. for admin ticket view). */
  redirectToVaOnSuccess?: boolean;
};

export default function ReassignTaskButton({ ticketId, currentStatus, redirectToVaOnSuccess = true }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (!REASSIGNABLE_STATUSES.includes(currentStatus)) return null;

  const onSuccess = () => {
    if (redirectToVaOnSuccess) router.push("/va");
    else router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowModal(true)}
      >
        Assign to another specialist
      </button>
      {showModal && (
        <ReassignTaskModal
          ticketId={ticketId}
          onSuccess={onSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
