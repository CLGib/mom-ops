type VAProfileCardProps = {
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  size?: "sm" | "md";
};

function getInitials(name: string | null | undefined): string {
  const s = name == null ? "" : String(name).trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return (first && last ? first + last : s.slice(0, 2)).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase() || "?";
}

export default function VAProfileCard({
  displayName,
  bio,
  profileImageUrl,
  size = "md",
}: VAProfileCardProps) {
  const px = size === "sm" ? 40 : 48;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-md)",
        padding: "var(--space-sm) 0",
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "var(--color-muted-bg, #f0f0f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: size === "sm" ? "0.875rem" : "1rem",
              fontWeight: 600,
              color: "var(--color-muted, #666)",
            }}
          >
            {getInitials(displayName)}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontWeight: 500,
            margin: 0,
            fontSize: size === "sm" ? "0.9rem" : "1rem",
          }}
        >
          {displayName}
        </p>
        {bio && (
          <p
            className="text-muted"
            style={{
              margin: "var(--space-2xs) 0 0",
              fontSize: "0.875rem",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {bio}
          </p>
        )}
      </div>
    </div>
  );
}
