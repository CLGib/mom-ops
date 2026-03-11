/**
 * Holiday options for member profile "Holidays celebrated" checkboxes.
 * IDs are stored in profiles.holidays_celebrated (jsonb array).
 */

export type HolidayOption = { id: string; label: string };

export const HOLIDAYS_BY_CATEGORY: Record<string, HolidayOption[]> = {
  "Christian": [
    { id: "christmas", label: "Christmas" },
    { id: "easter", label: "Easter" },
    { id: "advent", label: "Advent" },
    { id: "lent", label: "Lent" },
    { id: "epiphany", label: "Epiphany" },
    { id: "good_friday", label: "Good Friday" },
    { id: "ash_wednesday", label: "Ash Wednesday" },
    { id: "palm_sunday", label: "Palm Sunday" },
    { id: "pentecost", label: "Pentecost" },
    { id: "all_saints", label: "All Saints' Day" },
    { id: "all_souls", label: "All Souls' Day" },
  ],
  "Jewish": [
    { id: "rosh_hashanah", label: "Rosh Hashanah" },
    { id: "yom_kippur", label: "Yom Kippur" },
    { id: "hanukkah", label: "Hanukkah" },
    { id: "passover", label: "Passover" },
    { id: "sukkot", label: "Sukkot" },
    { id: "purim", label: "Purim" },
    { id: "shavuot", label: "Shavuot" },
  ],
  "Islamic": [
    { id: "eid_al_fitr", label: "Eid al-Fitr" },
    { id: "eid_al_adha", label: "Eid al-Adha" },
    { id: "ramadan", label: "Ramadan" },
    { id: "mawlid", label: "Mawlid al-Nabi" },
  ],
  "Hindu": [
    { id: "diwali", label: "Diwali" },
    { id: "holi", label: "Holi" },
    { id: "navaratri", label: "Navaratri" },
    { id: "dussehra", label: "Dussehra" },
  ],
  "Buddhist": [
    { id: "vesak", label: "Vesak" },
    { id: "lunar_new_year_buddhist", label: "Lunar New Year" },
  ],
  "Secular / US federal": [
    { id: "new_year", label: "New Year's Day" },
    { id: "thanksgiving", label: "Thanksgiving" },
    { id: "independence_day", label: "Independence Day" },
    { id: "memorial_day", label: "Memorial Day" },
    { id: "labor_day", label: "Labor Day" },
    { id: "mlk_day", label: "Martin Luther King Jr. Day" },
    { id: "presidents_day", label: "Presidents Day" },
    { id: "juneteenth", label: "Juneteenth" },
    { id: "veterans_day", label: "Veterans Day" },
  ],
  "Other": [
    { id: "kwanzaa", label: "Kwanzaa" },
    { id: "lunar_new_year", label: "Lunar New Year (general)" },
    { id: "day_of_the_dead", label: "Día de los Muertos" },
    { id: "ostara", label: "Ostara (Spring Equinox)" },
    { id: "yule", label: "Yule (Winter Solstice)" },
    { id: "diwali_sikh", label: "Bandi Chhor Divas (Sikh)" },
  ],
};

export const ALL_HOLIDAY_IDS = Object.values(HOLIDAYS_BY_CATEGORY).flatMap((list) =>
  list.map((h) => h.id)
);
