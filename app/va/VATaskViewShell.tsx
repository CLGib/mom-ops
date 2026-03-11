"use client";

import { useMemberPanel } from "./MemberPanelContext";

type Props = {
  mainContent: React.ReactNode;
  memberContent: React.ReactNode;
};

/** Wraps VA task view content: main area + optional right Member sidebar (push layout). Toggle via MemberPanelContext. */
export default function VATaskViewShell({ mainContent, memberContent }: Props) {
  const { memberPanelOpen } = useMemberPanel();

  return (
    <div className="va-task-with-sidebar">
      <div className="va-task-with-sidebar__main">{mainContent}</div>
      {memberPanelOpen && (
        <aside className="va-task-with-sidebar__member" aria-label="Member overview">
          {memberContent}
        </aside>
      )}
    </div>
  );
}
