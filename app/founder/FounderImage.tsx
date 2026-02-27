"use client";

import { useState } from "react";

export default function FounderImage() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: "50%",
        overflow: "hidden",
        backgroundColor: "var(--color-border, #e5e5e5)",
        flexShrink: 0,
      }}
    >
      {!error ? (
        <img
          src="/founder.jpg"
          alt="Founder"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: loaded ? "block" : "none",
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : null}
      {(!loaded || error) && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.875rem",
            color: "var(--color-muted, #666)",
          }}
          aria-hidden
        >
          Photo
        </div>
      )}
    </div>
  );
}
