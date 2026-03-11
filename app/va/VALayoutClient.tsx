"use client";

import { usePathname } from "next/navigation";
import SidebarLayout, { type NavLink } from "../components/SidebarLayout";
import { MemberPanelProvider, MemberPanelToggle } from "./MemberPanelContext";

type Props = {
  brandLabel: string;
  brandHref: string;
  navLinks: NavLink[];
  headerRight: React.ReactNode;
  sidebarExtra?: React.ReactNode;
  drawerFooter?: React.ReactNode;
  children: React.ReactNode;
};

/** VA layout with route-aware content width: full width when on a task detail page. On task view, wraps in MemberPanelProvider and shows Member toggle. */
export default function VALayoutClient({
  brandLabel,
  brandHref,
  navLinks,
  headerRight,
  sidebarExtra,
  drawerFooter,
  children,
}: Props) {
  const pathname = usePathname();
  const isTaskDetailPage = pathname !== "/va" && pathname !== "/va/tasks" && /^\/va\/[^/]+$/.test(pathname);
  const contentClassName = ["va-portal-full-width", isTaskDetailPage ? "va-task-full-width" : null].filter(Boolean).join(" ");

  const headerRightWithToggle = isTaskDetailPage ? (
    <>
      <MemberPanelToggle />
      {headerRight}
    </>
  ) : (
    headerRight
  );

  const content = (
    <SidebarLayout
      brandLabel={brandLabel}
      brandHref={brandHref}
      navLinks={navLinks}
      headerRight={headerRightWithToggle}
      sidebarExtra={sidebarExtra}
      drawerFooter={drawerFooter}
      contentClassName={contentClassName}
    >
      {children}
    </SidebarLayout>
  );

  if (isTaskDetailPage) {
    return <MemberPanelProvider>{content}</MemberPanelProvider>;
  }
  return content;
}
