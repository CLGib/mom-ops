type Props = {
  displayName: string;
  avatarUrl?: string | null;
  title?: string;
  children?: React.ReactNode;
  /** Optional class for the name span (e.g. member-portal for responsive hide) */
  nameClassName?: string;
  /** Optional class for the logout link (e.g. member-portal__header-logout for responsive hide) */
  logoutClassName?: string;
};

function Avatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const name = (displayName ?? "").trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const size = 32;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-soft-bg, #f8f5ed)",
        color: "var(--accent, #b8860b)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function HeaderUser({ displayName, avatarUrl, title, children, nameClassName, logoutClassName }: Props) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <Avatar displayName={displayName} avatarUrl={avatarUrl ?? null} />
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0 }}>
        <span
          className={nameClassName}
          style={{ fontSize: "0.875rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={title}
        >
          {displayName ?? "Member"}
        </span>
        {children}
      </span>
      <a
        href="/api/auth/signout"
        className={`link ${logoutClassName ?? ""}`.trim()}
        style={{ fontSize: "0.875rem", minHeight: 44, display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      >
        Log out
      </a>
    </span>
  );
}
