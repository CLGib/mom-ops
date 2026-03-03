#!/usr/bin/env node
/**
 * Adds rank field to task-library.json based on estimated usage by busy moms.
 * Lower rank = more popular. Update this list as real usage data becomes available.
 */
import fs from "fs";

const data = JSON.parse(fs.readFileSync("src/data/task-library.json", "utf8"));

// Task names in order of estimated popularity (1 = most used)
const PRIORITY_ORDER = [
  // Daily / weekly - meal planning, groceries, household
  "Grocery order build (from pantry photo or list)",
  "Weekly dinner plan from what's already in my fridge",
  "Meal plan template (weekly with dietary preferences)",
  "Grocery list from a given meal plan",
  "Meal kit service comparison (3 options)",
  "Chore chart creation (kids or whole family)",
  "Age-appropriate chore list for my kid",
  "House cleaner research (3 options)",
  "Weekly family schedule build (master calendar)",
  "Subscription audit (what am I paying for?)",
  "Pantry/freezer inventory spreadsheet",
  "Babysitter rate research for my area",
  "Emergency contact sheet (printable for fridge)",
  "Babysitter instruction sheet template",
  "Carpool coordination template",
  "Carpool schedule template",
  // Communication - quick wins
  "Polished communication draft",
  "Vendor email draft",
  "Thank you note (single)",
  "Thank you note batch (up to 5)",
  "Thoughtful card message draft",
  "Proofreading (up to 5 pages)",
  "Spreadsheet cleanup or formatting",
  "Comparison table creation",
  // Kids - school & activities
  "Daycare/preschool comparison (up to 5)",
  "Summer camp comparison (up to 5 options)",
  "After-school activity shortlist (3 options)",
  "Tutor research (3 options)",
  "Back to school supply list (by grade/school)",
  "Back to school schedule template",
  "Lunchbox idea list (2 weeks of school lunches)",
  "Rainy day activity list (20 ideas)",
  "Screen time rules template (printable)",
  "Bedtime routine visual schedule (for kids)",
  "Allowance system setup (age-appropriate)",
  "504/IEP meeting prep questions list",
  // Gifts & sourcing
  "Teacher gift ideas (3 curated options)",
  "End of year teacher gift ideas (3 options)",
  "Holiday gift shortlist (per person)",
  "Gift list brainstorm (per person up to 3 ideas)",
  "Birthday invitation design",
  "Birthday party theme research + Pinterest-style idea board",
  "Event outfit sourcing (3 options)",
  // Health & wellness
  "Doctor/specialist research (3 in-network options)",
  "Pediatrician new patient checklist + questions",
  "Dentist research (3 options accepting new patients)",
  "Sleep routine research (for child age-specific)",
  "Meal train setup research + template",
  "Healthy snack ideas list (by age/preference)",
  "Allergy-friendly recipe research (3 options)",
  // Travel
  "Packing list (customized by trip type/destination)",
  "Hotel shortlist (3 options with pros/cons)",
  "Flight option research (3 options with dates/prices)",
  "Airbnb/VRBO shortlist (3 options)",
  "Kids activity research for a destination",
  "Road trip activity kit checklist",
  "Road trip route + stops research",
  "Holiday travel packing list (family customized)",
  // Seasonal & holidays
  "Holiday card layout",
  "Holiday card list organization (spreadsheet with addresses)",
  "Holiday gift tracker spreadsheet",
  "Holiday card message draft (family letter style)",
  "Holiday meal menu planning (with dietary notes)",
  "Holiday meal grocery list (from a given menu)",
  "Thanksgiving seating + timeline coordination doc",
  "Christmas morning schedule/logistics doc",
  "Teacher appreciation week ideas + timeline",
  "Halloween costume research (3 options per child)",
  "Easter basket ideas (per child 3 options)",
  "Valentine's Day class party supply research",
  "Elf on the Shelf idea list (2 weeks of ideas)",
  "Advent calendar activity list (24 ideas)",
  // Events
  "Party timeline + checklist",
  "Vendor research (3 options)",
  "Photo editing (up to 10 photos)",
  "First birthday slideshow",
  "Baby shower planning checklist",
  "Baby/bridal shower planning checklist",
  "Playdate or get-together invitation",
  "Playdate thank you text draft",
  // Social
  "Group gift coordination email/message",
  "Birthday reminder spreadsheet setup",
  "Sympathy or sensitive message draft",
  "Neighborhood welcome gift ideas (3 options)",
  // Micro-tasks - quick wins
  "Find the phone number for [specific business]",
  "What time does [store/office] close today?",
  "Look up a recipe for [specific dish]",
  "Find a copycat recipe for [restaurant dish]",
  "Find a quick craft for my kid to do RIGHT NOW",
  "Text draft to cancel plans without sounding flaky",
  "Quick birthday party RSVP response draft",
  "Draft a quick excuse note for school",
  "What's the appropriate tip for [service]?",
  "Find where I can recycle [specific item] near me",
  "How do I get [specific stain] out of [specific fabric]?",
  "Can you find the tracking number for my [order]?",
  "What's the return policy for [store]?",
  "Find the lyrics to [song] for my kid's recital",
  "Laundry stain removal cheat sheet",
  // Car & vehicle
  "Car maintenance schedule tracker",
  "Mechanic research (3 options)",
  "Car insurance comparison (3 quotes)",
  "Car seat research by age/weight (3 options)",
  // Finances
  "Monthly budget template (family)",
  "Bill payment calendar/tracker",
  "Negotiate my bill - script/talking points",
  "Tax document checklist (annual)",
  // Pet care
  "Vet research (3 options)",
  "Pet sitter/dog walker research (3 options)",
  "Pet food comparison (3 options)",
  // Pregnancy & baby
  "Baby registry checklist (by category)",
  "Childcare research (daycare/nanny/au pair 3 options each)",
  "Baby proofing checklist (room by room)",
  "Hospital bag checklist",
  "Nursery planning checklist",
  "Registry product research (best products by category 3 options each)",
  "Baby shower invitation design",
  "Baby announcement draft (email/social/card)",
  "Maternity leave out-of-office email draft",
  // Home
  "Handyman/contractor research (3 options)",
  "House cleaner research (3 options)",
  "Spring cleaning checklist (room by room)",
  "Garage/closet organization plan",
  "Wi-Fi/internet plan comparison (3 options)",
  // Communication drafts
  "Difficult email to teacher (concern/complaint)",
  "Declining a volunteer request gracefully",
  "Setting boundaries with family member (text/email)",
  "Reply to a passive-aggressive text",
  "Complaint letter to company/service",
  "Recommendation request email (for your kid or yourself)",
  "Tricky group text reply (moms' group/neighborhood/etc)",
  // Kids & parenting
  "Potty training plan/schedule template",
  "Summer boredom buster list (30 ideas)",
  "Book list by age and interest (10 recommendations)",
  "Science fair project ideas (3 options by grade level)",
  "Camp packing list (customized)",
  "Tooth fairy letter draft",
  "Letter from Santa draft",
  "First day of school sign (printable)",
  "Kids' clothing size tracker spreadsheet",
  "Nanny share agreement template",
  "Nanny share research guide",
  // Self-care
  "Date night idea list (10 ideas for my area)",
  "Therapist-finding checklist + 3 options",
  "Morning routine optimization plan",
  "Spa/salon research (3 options)",
  "Mom's night out ideas (5 options for my area)",
  // Digital
  "Family shared calendar setup guide",
  "Phone photo organization plan",
  "Streaming service audit (what to keep/cancel)",
  "Email inbox cleanup strategy",
  "Kid's first phone setup guide + rules template",
  // Emergency
  "Family emergency plan (printable)",
  "Emergency kit supply checklist",
  "Babysitter/caregiver emergency binder",
  "Important documents checklist + where to store guide",
];

const rankByTask = new Map();
PRIORITY_ORDER.forEach((name, i) => {
  rankByTask.set(name, i + 1);
});

const DEFAULT_RANK = 500; // Tasks not in list sort after prioritized ones

const updated = data.map((t) => ({
  ...t,
  rank: rankByTask.get(t.task) ?? DEFAULT_RANK,
}));

// For unranked tasks, use category + task name for stable secondary sort
const categoryOrder = [...new Set(updated.map((t) => t.category))].sort();
const catRank = new Map(categoryOrder.map((c, i) => [c, i * 1000]));
updated.forEach((t) => {
  if (t.rank === DEFAULT_RANK) {
    t.rank = DEFAULT_RANK + catRank.get(t.category) + t.task.charCodeAt(0);
  }
});

fs.writeFileSync("src/data/task-library.json", JSON.stringify(updated));
console.log(`Updated ${updated.length} tasks with ranks. Top 10:`);
updated
  .sort((a, b) => a.rank - b.rank)
  .slice(0, 10)
  .forEach((t, i) => console.log(`  ${i + 1}. [${t.rank}] ${t.task}`));
