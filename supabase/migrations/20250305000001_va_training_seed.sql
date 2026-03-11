-- Seed default VA training sections (SOPs). Admin can edit or add more later.
do $$
begin
  if not exists (select 1 from public.va_training_sections limit 1) then
    insert into public.va_training_sections (title, content, sort_order)
    values
  (
    'Company values',
    'Mom Ops exists to reduce mental load for moms. Our values:\n\n• **Reduce mental load** – Your job is to remove decisions, not add questions. Review member context and past tickets before asking for more.\n• **Go one step beyond** – Deliver one level above the ask. Anticipate the next need.\n• **Warm, calm, capable** – We are steady, thoughtful, and human. Never robotic or dramatic.\n• **Integrity** – No medical, legal, or financial advice. When in doubt, ask Chrissy.',
    10
  ),
  (
    'Communication & email',
    '**General communication**\n• Mirror the member’s tone: if they use emojis, you may too; if they’re concise, be concise.\n• Match their style to build rapport. Reference past conversations and personal details when relevant.\n\n**Email communication**\n• Use the Email Macro library (on the task page or via Email Macros in the sidebar) for tone and structure. Always personalize—never copy verbatim.\n• Keep replies clear and low-friction. Confirm what you’re doing and when they can expect an update.\n• Sign off as appropriate; keep the Mom Ops voice: warm, calm, capable.',
    20
  ),
  (
    'Security',
    '• **Member data** – Use only the tools and context provided. Do not share member details, tickets, or attachments outside the platform.\n• **Passwords & access** – Never ask for or store passwords. Use secure links when you need access to an account or document.\n• **Attachments** – Only open or download files from the task thread. Do not forward member documents to personal email or devices.\n• **Questions** – If a request touches financial, legal, or health information, follow the “What we cannot do” guidelines and escalate when unsure.',
    30
  ),
  (
    'How to do tasks',
    '• **Before you start** – Open Member context (link on the task page) to see profile, onboarding survey, and quizzes. Use this to personalize and avoid asking for info they’ve already shared.\n• **While working** – Reduce mental load: solve as much as you can before going back with questions. Use the task library and templates where applicable.\n• **Before submitting** – Ask: Did I reduce her mental load? Did I anticipate the next need? Did I match her style and add value beyond the minimum?\n• **Deliverables** – Clean, organized, easy to read, decision-light. Where appropriate: printable versions, options, summaries.',
    40
  ),
  (
    'How to grow within the company',
    '• **Excellence** – Consistently high quality and “one step beyond” lead to better reviews, repeat requests, and higher tips.\n• **Performance bonuses** – Random bonuses for 5-star reviews; surprise bonuses for outstanding work. Strong feedback and repeat requests increase earning potential.\n• **Relationship building** – Members who request you again build trust and task volume. Remember details, reference past conversations, offer thoughtful follow-ups.\n• **Feedback** – Use Request a Feature & Report Bug (in the sidebar) to suggest improvements. We use your input to make the platform and processes better.',
    50
  );
  end if;
end;
$$;
