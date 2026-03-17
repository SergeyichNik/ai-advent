
# Browser Test Task

## Context

This is an AI chat app (React + Express) supporting two LLM providers: Google Gemini and DeepSeek.
Dev server runs on:
- Vite (frontend): http://localhost:5174
- Express (API): http://localhost:3001

Start servers with: `npm run dev` from project root.

## What needs to be done

Run the test cases below in the browser using Playwright MCP and **record a video** of the session.

### Playwright setup

The MCP is configured to use **Chromium** (not system Chrome). If you get a browser launch error, it means Chrome is running and conflicting. In that case Chromium should work — the config was already updated to `--browser chromium`.

To verify: `claude mcp get playwright`

### How to record video

Use `browser_run_code` to start tracing before tests and save it after:

```js
// Start (run once before tests)
async (page) => {
  await page.context().tracing.start({ screenshots: true, snapshots: true });
}

// Stop and save (run once after all tests)
async (page) => {
  await page.context().tracing.stop({ path: '.playwright-mcp/trace.zip' });
}
```

Alternatively, use `browser_take_screenshot` after each step to document the flow.

---

## Test Cases

### TC-1: Without constraints

1. Open http://localhost:5174
2. Click ⚙ (settings) — verify Provider = "DeepSeek" is selected by default
3. Close settings
4. Type in chat: `Explain what is machine learning`
5. Send and wait for response
6. Take screenshot of the full response

**Expected:** Long, detailed response with headers and sections (~2000 chars)

---

### TC-2: With constraints

1. Reload the page (fresh conversation)
2. Click ⚙ (settings)
3. Set: Format = **Bullet points**, Max tokens = **150**, add stop sequence **###**
4. Close settings
5. Type in chat: `Explain what is machine learning`
6. Send and wait for response
7. Take screenshot of the full response

**Expected:** Short bullet-point list (~800 chars), no headers, stops at ### if model generates one

---

### TC-3: Switch provider mid-conversation

1. Continue from TC-2 (or fresh page)
2. Send a message with DeepSeek: `What is 2+2?`
3. Open settings → switch Provider to **Google Gemini**
4. Send: `What is 3+3?`
5. Take screenshot showing both responses in chat

**Expected:** Both responses visible, different provider used for each

---

## What to capture

- Screenshot after each response
- Full page screenshot at the end showing the conversation
- Note response lengths and format differences in a summary

## Previous API test results (for reference)

Without constraints: **2004 chars**, mixed markdown with headers
With constraints (bullet, 150 tokens, stop=###): **814 chars**, clean bullet list
