-- Point the Mom Ops Branded Document Generator card to the in-app Branding Assistant.
update public.va_toolbox_cards
set how_to_use = 'Use the **Branding Assistant** in the Toolbox (Toolbox → Branding Assistant) to upload a .docx or spreadsheet, or paste markdown, and get a Mom Ops–branded file. No need to copy into a Claude project.',
    updated_at = now()
where title = 'Mom Ops Branded Document Generator';
