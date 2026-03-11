import { sanitizeMessageBody } from "@/lib/sanitize-html";

export default function MessageBody({ message }: { message: string | null | undefined }) {
  const html = sanitizeMessageBody(message);
  return (
    <div
      className="thread-message-body"
      style={{ lineHeight: 1.5 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
