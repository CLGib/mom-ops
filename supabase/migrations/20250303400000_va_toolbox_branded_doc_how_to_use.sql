-- Update Mom Ops Branded Document Generator card: add reminder to upload finished .docx to Toolbox Templates.
update public.va_toolbox_cards
set how_to_use = 'Copy into a Claude Project as a Project Instruction; then say "brand this" or paste markdown to get a branded .docx. Once finished, upload the file to Toolbox → Templates for others to use.',
    updated_at = now()
where title = 'Mom Ops Branded Document Generator';
