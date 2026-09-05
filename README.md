# NeuralCore AI — standalone deploy

This is a real, always-on version of NeuralCore AI: a small Node/Express server
serves the app and holds your Anthropic API key server-side, so the phone (or
any browser) never sees the key and the app works outside Claude's own chat
interface.

## 1. Get an Anthropic API key

This is separate from any Claude.ai subscription — it's pay-per-use billing
tied to your own Anthropic account.

1. Go to https://console.anthropic.com
2. Create (or sign in to) an account and add billing.
3. Create an API key under **API Keys**.

Cost reference (check https://docs.claude.com/en/docs/about-claude/pricing for
current rates, since these can change): Claude Sonnet 5, the model this app
uses, is currently $2 per million input tokens / $10 per million output
tokens. A single chart analysis (one image + a JSON reply) typically costs a
small fraction of a cent to a few cents depending on image size — there's no
monthly fee, you're billed only for what you use.

## 2. Deploy to Render.com

**Option A — one-click blueprint (recommended)**
1. Push this folder to a GitHub repository.
2. In Render, choose **New > Blueprint**, point it at your repo (it will pick
   up `render.yaml` automatically).
3. When prompted, paste your Anthropic API key into the `ANTHROPIC_API_KEY`
   field.
4. Deploy. Render gives you a URL like `https://neuralcore-ai.onrender.com`.

**Option B — manual web service**
1. Push this folder to a GitHub repository.
2. In Render, choose **New > Web Service** and connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Under **Environment**, add `ANTHROPIC_API_KEY` with your key.
6. Deploy.

## 3. Use it

Open the Render URL on your phone. On Android/Chrome or iOS/Safari you can
add it to your home screen (menu → "Add to Home Screen") so it opens like a
normal app.

## Notes

- Render's free plan spins the server down after inactivity, so the first
  request after a while will be slow (10–30s cold start) while it wakes up.
  A paid instance ($7/mo Starter plan as of writing) keeps it always-on.
- History and your theme choice are saved in the browser's local storage on
  whatever device you're using — they won't sync between your phone and a
  desktop browser.
- Nothing in this app talks to a real broker or live market feed — it only
  ever reads the screenshot you upload, matching the original brief.
- You can swap the model in `server.js` (the `MODEL` constant) to
  `claude-haiku-4-5-20251001` for a much cheaper (but less capable) option, or
  `claude-opus-5` for the most capable/most expensive option.
