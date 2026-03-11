"use client";

import { sanitizeMessageBody } from "@/lib/sanitize-html";

/** Replace #123 in text with links to /va/{id} when id is in ticketIdByNumber, then sanitize and render. */
function bodyWithTaskLinks(html: string, ticketIdByNumber: Record<string, string>): string {
  if (!html) return "";
  const withLinks = html.replace(/#(\d+)/g, (_, num: string) =>
    ticketIdByNumber[num] ? `<a href="/va/${ticketIdByNumber[num]}">#${num}</a>` : `#${num}`
  );
  return sanitizeMessageBody(withLinks);
}

type Props = {
  message: string | null | undefined;
  ticketIdByNumber?: Record<string, string>;
};

export default function CommunityMessageBody({ message, ticketIdByNumber = {} }: Props) {
  const html = bodyWithTaskLinks(message ?? "", ticketIdByNumber);
  return (
    <div
      className="thread-message-body"
      style={{ lineHeight: 1.5 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
