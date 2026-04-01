-- Seed two initial "Explore real examples" so the section has content after first deploy.
-- CEO can edit or add more via Admin > Landing examples. Run this migration once per environment.

insert into public.landing_real_examples (title, request_text, deliverable_images, deliverable_pdf, caption, sort_order)
values
  (
    'Easter basket shoppable list',
    'I need easter baskets for Myles, my 14 month old son, my husband, and my god children. My god children are: Anne-Marie, an almost 6 year old girl, and Anthony, a 14 month old boy. I like all to go into a reusable basket and outdoor/spring/summer activities are my favorite. I like to throw in a treat but not have the whole gift focused on candy.

For Myles — a swimsuit, sidewalk chalk — budget $40
My husband, Jarrett, loves Reese eggs — budget $20
For the godchildren, keep the budget around $20–$30
I prefer to do my shopping at Target or Amazon. Can you make me a shoppable list for these gifts?',
    null,
    '/assets/easter-basket-plan.pdf',
    'Shoppable list with Target and Amazon links, organized by person and budget.',
    0
  ),
  (
    'Piano recital invitation',
    'Create a flyer for our piano recital — Melodies in May. Soft spring colors, ready to print or share.',
    '["/assets/example-request-deliverable.png"]'::jsonb,
    null,
    'Polished invitation with soft spring colors, print-ready.',
    1
  );
