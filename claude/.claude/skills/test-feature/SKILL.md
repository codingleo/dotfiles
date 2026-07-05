---
name: test-feature
description: Use when the user says "test feature", "test the feature", "test it in the browser", "check it visually", or wants to manually verify recently implemented changes in the local dev environment. Uses dev-browser CLI for browser automation.
---

# Test Feature

Verify recent changes visually using `dev-browser` CLI against the local dev environment via Cloudflare tunnel.

## Prerequisites

`dev-browser` must be installed (`npm install -g dev-browser && dev-browser install`).

## Workflow

### 1. Check Running Processes

```bash
pgrep -f "cloudflared tunnel" > /dev/null && echo "TUNNEL RUNNING" || echo "TUNNEL NOT RUNNING"
pgrep -f "next dev" > /dev/null && echo "DEV SERVER RUNNING" || echo "DEV SERVER NOT RUNNING"
```

Skip starting anything that's already running.

### 2. Start Tunnel (if not running)

```bash
tunnel > /dev/null 2>&1 &
```

`tunnel` is a shell alias for `cloudflared tunnel run`. Run in background. Wait ~5s.

### 3. Start Dev Server (if not running)

```bash
bun run dev &
```

Wait for "Ready in" in output (~10-20s). Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 30 https://megazord.olhaminha.bio/
```

Must return 200 before proceeding.

### 4. Determine What to Test

Check recent changes via git diff, recent commits, or conversation context to know which page/feature to verify.

### 5. Navigate, Authenticate, and Test

**ALWAYS use `https://megazord.olhaminha.bio`** — never `localhost:3000`.

Use `dev-browser` with named pages for persistent state across script calls. The page name should reflect the test (e.g. `"test-edit-post"`).

#### Auto-login Script

Run this first to authenticate. If already logged in (URL contains `/dashboard`), skip login.

```bash
dev-browser --timeout 60 <<'SCRIPT'
const page = await browser.getPage("test");
await page.goto("https://megazord.olhaminha.bio/dashboard/socials", {
  waitUntil: "networkidle",
  timeout: 45000
});

// Check if already authenticated
if (page.url().includes("/dashboard")) {
  console.log(JSON.stringify({ status: "already-authenticated", url: page.url() }));
} else {
  // Trigger login modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Get Started'));
    if (btn) btn.click();
  });
  await page.waitForSelector('#test-password', { timeout: 10000 });

  // Fill test credentials and submit
  await page.fill('#test-password', 'test-password-dev-123');
  await page.click('button[type="submit"]:has-text("Test Sign In")');
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  console.log(JSON.stringify({ status: "logged-in", url: page.url() }));
}
SCRIPT
```

#### Navigate and Screenshot

After login, navigate to the target page and capture screenshots:

```bash
dev-browser --timeout 30 <<'SCRIPT'
const page = await browser.getPage("test");
await page.goto("https://megazord.olhaminha.bio/dashboard/socials", {
  waitUntil: "networkidle",
  timeout: 20000
});
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "feature-test.png");
console.log(JSON.stringify({ url: page.url(), screenshot: path }));
SCRIPT
```

Read the screenshot with the `Read` tool to view it.

#### Interact and Verify

Use `page.snapshotForAI()` to understand page structure, then interact:

```bash
dev-browser --timeout 30 <<'SCRIPT'
const page = await browser.getPage("test");
const snap = await page.snapshotForAI();
console.log(snap.full);
SCRIPT
```

Common interactions:
- `page.click(selector)` — click elements
- `page.fill(selector, value)` — fill inputs
- `page.getByRole(role, { name })` — target by accessibility role
- `page.waitForSelector(selector)` — wait for elements
- `page.evaluate(fn)` — run JS in page context

After each interaction, take a screenshot and read it to verify visual state.

### 6. Report Results

Summarize findings: what was tested, what looks correct, any visual issues found. Include screenshot paths so the user can review.

## Tips

| Issue | Fix |
|-------|-----|
| Timeout on navigation | Dev server may be compiling. Retry after 10s |
| Login modal not appearing | Try navigating to a protected route first |
| Page name reuse | Use the same page name across scripts to keep session |
| Large pages | Use `page.snapshotForAI()` for structure, screenshots for visual |
