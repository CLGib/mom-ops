/**
 * Sleep / maintenance mode for the whole site.
 *
 * When MAINTENANCE is true, middleware returns the calm "resting" page below for
 * every request, so the public site is offline while all code, content,
 * products, and data stay exactly where they are. Nothing is deleted.
 *
 * To wake Mom Ops back up: set MAINTENANCE to false, restore the crons in
 * vercel.json, and redeploy. (The broad middleware matcher can stay as-is.)
 */
export const MAINTENANCE = true;

/** The page every visitor sees while the site is asleep. Self-contained HTML. */
export function restingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Mom Ops is resting</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FAF9F7;
    color: #1A1917;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    text-align: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .wrap { max-width: 420px; }
  .brand {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #B8860B;
    font-weight: 600;
    margin-bottom: 28px;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30px;
    line-height: 1.25;
    margin: 0 0 14px;
    font-weight: normal;
  }
  p { color: #5C5955; font-size: 16px; line-height: 1.6; margin: 0; }
  .rule { width: 40px; height: 2px; background: #B8860B; margin: 28px auto 0; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Mom Ops</div>
    <h1>Taking a little nap. 💤</h1>
    <p>Mom Ops is resting for now. Thanks for stopping by. Back when it's back. 💛</p>
    <div class="rule"></div>
  </div>
</body>
</html>`;
}
