# TATA AIG Health Insurance Voice Agent — "Asha"

Twilio Voice + Cloudflare Workers + Gemini + D1 + Google Sheets + WhatsApp.
Same architecture shape as the original restaurant Twilio voice bot — only
the business domain and D1 schema changed. No Vapi, Deepgram, or ElevenLabs.

## Folder structure

```
tata-aig-voice-agent/
├── wrangler.toml
├── package.json
├── migrations/
│   └── 0001_init.sql          # D1 schema: customers, voice_calls, lead_scores,
│                               # appointments, callbacks, insurance_quotes, conversation_logs
├── src/
│   ├── index.js                # Worker entrypoint / router
│   ├── config.js                # stages, profiling question order
│   ├── prompts/
│   │   └── ashaSystemPrompt.js  # Asha's master system prompt + Gemini prompts
│   ├── handlers/
│   │   └── voice.js             # JS-owned call state machine (Say/Gather loop)
│   ├── services/
│   │   ├── gemini.js             # extractField() + answerObjection() + guardrail
│   │   ├── sheets.js             # Google Sheets push (Apps Script webhook)
│   │   ├── whatsapp.js           # Meta WhatsApp Cloud API — doc/quote sends
│   │   ├── leadScoring.js        # rule-based lead scorer
│   │   └── hospitalLocator.js    # cashless hospital lookup (MVP static data)
│   ├── tools/
│   │   └── index.js              # save_customer, schedule_callback, generate_quote,
│   │                              # send_whatsapp_documents, transfer_to_human,
│   │                              # find_cashless_hospital
│   ├── db/
│   │   ├── calls.js               # voice_calls + conversation_logs helpers
│   │   ├── customers.js
│   │   └── leads.js                # lead_scores, appointments, callbacks, quotes
│   └── utils/
│       └── twiml.js                 # <Say>/<Gather>/<Dial> builders
└── README.md
```

## Why a JS-owned state machine instead of Gemini driving the whole call

Gemini is only invoked for two things:
1. `extractField()` — pulling a structured value (age, budget, etc.) out of a
   free-text spoken answer.
2. `answerObjection()` — answering an in-scope question/objection mid-call,
   passed through `validateAIReply()` so it can never drift into
   off-topic territory.

The call flow itself (greeting → identity → permission → profiling →
need analysis → recommend → objections → contact → schedule → end) is
controlled entirely by `handlers/voice.js`. This keeps behavior predictable
and testable on a phone call, where a hallucinated tangent is much harder
to recover from than in a chat window.

## Setup

1. `npm install`
2. Create the D1 database and paste its id into `wrangler.toml`:
   ```
   wrangler d1 create tata_aig_voice_db
   ```
3. Run the migration:
   ```
   npm run db:migrate:local   # for local dev
   npm run db:migrate:remote  # once deployed
   ```
4. Set secrets:
   ```
   wrangler secret put GEMINI_API_KEY
   wrangler secret put GOOGLE_SHEETS_WEBHOOK_URL
   wrangler secret put WHATSAPP_TOKEN
   wrangler secret put WHATSAPP_PHONE_NUMBER_ID
   wrangler secret put HUMAN_TRANSFER_NUMBER
   ```
5. Deploy:
   ```
   npm run deploy
   ```
6. In Twilio, point your phone number's Voice webhook to:
   `https://<your-worker>.workers.dev/voice/incoming` (HTTP POST)
   and, optionally, the Status Callback to `/voice/status`.

## What was intentionally left as MVP stubs

- `generate_quote()` uses a simple age/family-size premium band, not the
  real TATA AIG rating engine — swap in a real API when available.
- `hospitalLocator.js` uses a static city → hospital list — replace with a
  real network lookup/D1 table.
- `sheets.js` expects a Google Apps Script Web App URL (same integration
  style as the old restaurant order sheet) — the Apps Script snippet is
  in the file's header comment.
- WhatsApp document links in `services/whatsapp.js` are placeholders —
  point them at your real hosted PDFs.
- Contact collection (`handleCollectContact`) does a simple raw-string
  save for name — for production, run it through `extractField()` twice
  (name, then email) like the profiling stage does.
