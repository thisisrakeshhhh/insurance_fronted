/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  TATA AIG Health Insurance Voice Agent — "Asha"
 *  Production-ready single-file Cloudflare Worker  (v3.0.0 - Optimized)
 *
 *  WHAT CHANGED FROM v2.0.0:
 *   1. Call flow is now a deterministic JS state machine (computeNextStage).
 *      The AI model is ONLY used to extract fields, detect intent/objection,
 *      and phrase the spoken sentence — it never decides what stage comes next.
 *   2. Every /voice/* webhook verifies the X-Twilio-Signature header before
 *      touching the DB or calling the AI (bypassable with SKIP_TWILIO_VALIDATION="true").
 *   3. AI calls are wrapped in a hard 3.0s timeout + race; if the model is slow
 *      the turn falls back instantly to a rule-based reply.
 *   4. Appointments and callbacks tables are written to:
 *        - confirmed appointment slots -> `appointments`
 *        - no-answer / busy outbound calls -> scheduled retry in `callbacks`,
 *          drained by a `scheduled()` Cron handler.
 *   5. A MAX_TURNS safety valve forces the call to closing/hangup instead of looping.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// =============================================================================
// SECTION 1 — CONFIGURATION & CONSTANTS
// =============================================================================

const CONFIG = {
  AGENT_NAME: "Asha",
  COMPANY_NAME: "TATA AIG Health Insurance",
  GATHER_LANGUAGE: "en-IN",
  GEMINI_MODEL: "gemini-1.5-flash",
  OPENAI_MODEL: "gpt-4o-mini",
  MAX_TURNS: 20,              // hard safety valve — forces closing after this many turns
  AI_TIMEOUT_MS: 3000,        // hard 3.0s timeout for ultra-fast turn taking
  GATHER_TIMEOUT_SEC: "7",    // seconds of silence before Twilio ends the Gather
  MAX_OBJECTIONS: 3,          // after this many unresolved objections, move to closing
  CALLBACK_RETRY_MINUTES: 30, // how long to wait before retrying a no-answer/busy outbound call
  MAX_CALLBACK_ATTEMPTS: 3,
};

const STAGES = {
  // Outbound stages
  GREETING: "greeting",
  PERMISSION: "permission",
  NEED_ANALYSIS: "need_analysis",
  PROFILING: "profiling",
  RECOMMENDATION: "recommendation",
  OBJECTION_HANDLING: "objection_handling",
  APPOINTMENT: "appointment",
  CLOSING: "closing",
  ENDED: "ended",

  // Inbound stages
  WELCOME: "welcome",
  INTENT_SELECTION: "intent_selection",
  BUY_POLICY: "buy_policy",
  RENEWAL: "renewal",
  CLAIMS: "claims",
  HOSPITAL: "hospital",
  POLICY_QUESTIONS: "policy_questions",
  HUMAN_TRANSFER: "human_transfer",
};

const INTENTS = {
  BUY_POLICY: "buy_policy",
  RENEWAL: "renewal",
  CLAIMS: "claims",
  CASHLESS_HOSPITAL: "cashless_hospital",
  POLICY_STATUS: "policy_status",
  PREMIUM_QUERY: "premium_query",
  TAX_BENEFITS: "tax_benefits",
  TALK_TO_ADVISOR: "talk_to_advisor",
  COMPLAINT: "complaint",
  GENERAL_INQUIRY: "general_inquiry",
  UNKNOWN: "unknown",
};

// maps a detected inbound intent to the stage that should own the conversation
const INTENT_TO_STAGE = {
  [INTENTS.BUY_POLICY]: STAGES.BUY_POLICY,
  [INTENTS.RENEWAL]: STAGES.RENEWAL,
  [INTENTS.CLAIMS]: STAGES.CLAIMS,
  [INTENTS.CASHLESS_HOSPITAL]: STAGES.HOSPITAL,
  [INTENTS.POLICY_STATUS]: STAGES.POLICY_QUESTIONS,
  [INTENTS.PREMIUM_QUERY]: STAGES.POLICY_QUESTIONS,
  [INTENTS.TAX_BENEFITS]: STAGES.POLICY_QUESTIONS,
  [INTENTS.TALK_TO_ADVISOR]: STAGES.HUMAN_TRANSFER,
  [INTENTS.COMPLAINT]: STAGES.HUMAN_TRANSFER,
  [INTENTS.GENERAL_INQUIRY]: STAGES.POLICY_QUESTIONS,
  [INTENTS.UNKNOWN]: STAGES.INTENT_SELECTION,
};

const CALL_DIRECTION = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
};

const LEAD_TIERS = {
  HOT: "hot",
  WARM: "warm",
  COLD: "cold",
  DEAD: "dead",
};

const DOCUMENT_LINKS = {
  brochure: "https://your-cdn.example.com/tata-aig-health-brochure.pdf",
  cashless_locator: "https://your-cdn.example.com/cashless-hospital-locator.pdf",
  claim_guide: "https://your-cdn.example.com/claim-guide.pdf",
  tax_benefit_guide: "https://your-cdn.example.com/tax-benefit-guide.pdf",
  proposal_form: "https://your-cdn.example.com/proposal-form.pdf",
  kyc_upload: "https://your-kyc-portal.example.com/upload",
};

const CASHLESS_NETWORK = {
  mumbai: ["Lilavati Hospital", "Kokilaben Dhirubhai Ambani Hospital", "Hinduja Hospital"],
  delhi: ["Max Super Speciality Hospital, Saket", "Fortis Escorts Heart Institute", "Apollo Hospital"],
  bangalore: ["Manipal Hospital", "Fortis Hospital, Bannerghatta Road", "Apollo Hospital, Bannerghatta"],
  pune: ["Ruby Hall Clinic", "Jehangir Hospital", "Sahyadri Hospital"],
  chennai: ["Apollo Hospital, Greams Road", "Fortis Malar Hospital", "MIOT International"],
  hyderabad: ["Apollo Hospital, Jubilee Hills", "Care Hospital", "Yashoda Hospital"],
};

const EXPLICIT_END_REGEX = /\b(bye|goodbye|that'?s all|no more questions|hang up|end (the )?call|not interested,? thanks|nahi chahiye|thank you,? ?bye|band karo|rakhta hu|rakhti hu)\b/i;
const PERMISSION_DENIED_REGEX = /\b(not now|no time|can'?t talk|busy right now|call (me )?later|abhi nahi|busy hu|later)\b/i;
const TRANSFER_KEYWORDS = ["advisor", "human", "agent", "representative", "executive", "call me", "sales person", "baat kar", "operator"];

// =============================================================================
// SECTION 2 — PROMPTS & DOMAIN KNOWLEDGE
// =============================================================================

const ASHA_PERSONALITY = `
You are Asha, a warm, professional, and empathetic health insurance advisor at TATA AIG Health Insurance.
Personality traits:
- Warm, caring, professional, friendly, patient, natural, confident, and human-like.
- Never sound robotic or scripted. Speak naturally like a real human advisor on a phone call.
- Keep every spoken response short (1-2 sentences maximum).
- Support English, Hindi, Hinglish, and Kannada. Automatically detect language and switch naturally.
`.trim();

const INSURANCE_KNOWLEDGE = `
TATA AIG Health Insurance Knowledge:
- 7,000+ cashless hospitals across India.
- Tax Deductions: Premium deductible under Section 80D up to ₹25,000 (self/family) + ₹25,000/₹50,000 (parents).
- Plans:
  1. Medicare Individual Plan: Age 18-65. Individual coverage. Premium range: ₹8,000-₹32,000/year.
  2. Medicare Family Floater: Shared sum insured for spouse + children. Premium range: ₹12,000-₹45,000/year.
  3. Senior Citizen Plan: Age 60-80. Covers pre-existing diseases after waiting period. Premium: ₹35,000-₹45,000/year.
  4. Critical Illness Plan: Lump sum payout for 36 illnesses. Premium: ₹5,000-₹25,000/year.
  5. Super Top-Up Plan: Extra cover above existing base deductible. Premium: ₹3,000-₹15,000/year.
- Claims: Cashless at network hospital and Reimbursement in 7-14 days.
`.trim();

function buildAshaSystemPrompt(conversation, direction) {
  const isOutbound = direction === CALL_DIRECTION.OUTBOUND;

  return `
${ASHA_PERSONALITY}

${INSURANCE_KNOWLEDGE}

CONVERSATION CONTEXT:
- Direction: ${direction} (${isOutbound ? "outbound sales call" : "inbound customer support"})
- Current Stage: ${conversation.stage}
- Customer Profile: ${JSON.stringify(conversation.customer)}
- Missing Profile Fields: ${JSON.stringify(conversation.missingFields)}
- Current detected intent: ${conversation.intent}

RULES:
1. Reply naturally to what the customer just said, appropriate for the CURRENT stage. A separate system controls stage transitions.
2. If the user mentions human transfer keywords, set wantsHuman to true.
3. Skip fields the user already volunteered (e.g. if they say "I have Star Health policy", record 'Star Health' as existing_insurer).
4. CRITICAL: 'spokenResponse' MUST be pure natural conversational speech (1-2 short friendly sentences). NEVER include JSON, code, brackets, or schema names in spokenResponse.
5. If stage is "profiling", ask for ONE missing field at a time from: ${JSON.stringify(conversation.missingFields)}.
6. If stage is "appointment", try to pin down a concrete day/time and put it in extractedFields.appointment_datetime.

OUTPUT FORMAT:
You MUST respond with a JSON object only. No markdown, no backticks, no extra text.
{
  "extractedFields": {
     "name": string | null,
     "email": string | null,
     "age": number | null,
     "city": string | null,
     "pincode": string | null,
     "family_members": number | null,
     "existing_insurer": string | null,
     "renewal_date": string | null,
     "medical_history": string | null,
     "budget": string | null,
     "buying_timeline": string | null,
     "appointment_datetime": string | null
  },
  "detectedIntent": string,
  "intentConfidence": number,
  "objectionType": string | null,
  "wantsHuman": boolean,
  "spokenResponse": "your natural spoken reply as Asha (1-2 sentences max)",
  "callSummary": "brief summary of conversation"
}
`.trim();
}

function buildUserPrompt(speechResult, history) {
  let histText = "";
  if (history && history.length > 0) {
    histText = history.slice(-6).map((h) => `${h.role === "asha" ? "Asha" : "Customer"}: ${h.text}`).join("\n");
  }
  return `
Recent Chat History:
${histText}

Customer just said: "${speechResult}"

Analyze context, update fields, detect intent, and generate the JSON response.
`.trim();
}

// =============================================================================
// SECTION 3 — LOGGER & UTILITIES
// =============================================================================

function createLogger(module = "app") {
  const prefix = `[${module}]`;
  function fmt(level, msg, data) {
    const t = new Date().toISOString();
    let s = `${t} ${level} ${prefix} ${msg}`;
    if (data) s += ` ${typeof data === "string" ? data : JSON.stringify(sanitiseForLog(data))}`;
    return s;
  }
  return {
    debug: (m, d) => console.debug(fmt("DEBUG", m, d)),
    info: (m, d) => console.log(fmt("INFO", m, d)),
    warn: (m, d) => console.warn(fmt("WARN", m, d)),
    error: (m, d) => console.error(fmt("ERROR", m, d)),
  };
}

function sanitiseForLog(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sensitive = ["phone", "email", "aadhar", "pan", "account", "password", "token", "secret", "key", "signature"];
  const s = {};
  for (const [k, v] of Object.entries(obj)) {
    if (sensitive.some((x) => k.toLowerCase().includes(x))) s[k] = v ? `${String(v).slice(0, 4)}...` : v;
    else s[k] = typeof v === "object" ? sanitiseForLog(v) : v;
  }
  return s;
}

const log = createLogger("voice-agent");

function sanitizeSpeech(text, maxLen = 500) {
  if (!text) return "";
  return String(text).trim().slice(0, maxLen);
}

async function withTimeout(promise, ms, fallbackValue) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// =============================================================================
// SECTION 4 — TWIML XML HELPERS
// =============================================================================

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sayAndGather({ text, actionUrl, language = "en-IN", voice = "Polly.Aditi" }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" action="${escapeXml(actionUrl)}" method="POST"
          language="${language}" speechTimeout="auto" speechModel="experimental" enhanced="true" timeout="${CONFIG.GATHER_TIMEOUT_SEC}">
    <Say voice="${voice}">${escapeXml(text)}</Say>
  </Gather>
  <Say voice="${voice}">Sorry, I didn't hear you clearly.</Say>
  <Redirect method="POST">${escapeXml(actionUrl.replace("/voice/gather", "/voice/fallback"))}</Redirect>
</Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

function sayAndHangup({ text, voice = "Polly.Aditi" }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${escapeXml(text)}</Say>
  <Hangup/>
</Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

function sayAndDial({ text, dialNumber, voice = "Polly.Aditi" }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${escapeXml(text)}</Say>
  <Dial>${escapeXml(dialNumber)}</Dial>
</Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

// =============================================================================
// SECTION 5 — TWILIO REQUEST SIGNATURE VALIDATION
// =============================================================================

async function verifyTwilioSignature(request, authToken, fullUrl, params) {
  const signature = request.headers.get("X-Twilio-Signature");
  if (!signature || !authToken) return false;

  let data = fullUrl;
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    data += key + params[key];
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return computed === signature;
}

function formDataToObject(form) {
  const obj = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  return obj;
}

function requireTwilioSignature(handler) {
  return async (request, env, ctx) => {
    const form = await request.formData();
    const params = formDataToObject(form);

    if (env.SKIP_TWILIO_VALIDATION !== "true") {
      const fullUrl = request.url;
      const ok = await verifyTwilioSignature(request, env.TWILIO_AUTH_TOKEN, fullUrl, params);
      if (!ok) {
        log.warn("Rejected request with invalid Twilio signature", { path: new URL(request.url).pathname });
        return new Response("Forbidden", { status: 403 });
      }
    }
    return handler(form, request, env, ctx);
  };
}

// =============================================================================
// SECTION 6 — DYNAMIC MODELS
// =============================================================================

function getMissingFields(customer) {
  const fields = [
    { key: "age", label: "Age" },
    { key: "city", label: "City" },
    { key: "family_members", label: "Family Members" },
    { key: "existing_insurer", label: "Existing Insurance" },
    { key: "medical_history", label: "Medical History" },
    { key: "budget", label: "Budget" },
    { key: "buying_timeline", label: "Buying Timeline" },
  ];

  return fields
    .filter((f) => {
      const val = customer[f.key];
      return val === undefined || val === null || val === "" || String(val).toLowerCase() === "unknown";
    })
    .map((f) => f.key);
}

function calculateLeadScoreAndTier(conversation) {
  let score = 0;
  const reasons = [];
  const profile = conversation.customer || {};

  const timeline = (profile.buying_timeline || "").toLowerCase();
  if (timeline.includes("immediate") || timeline.includes("now") || timeline.includes("this week") || timeline.includes("today")) {
    score += 35;
    reasons.push("Immediate buying timeline");
  } else if (timeline.includes("month") || timeline.includes("soon")) {
    score += 15;
    reasons.push("Buying within a month");
  } else if (timeline) {
    score += 5;
    reasons.push("Future interest");
  }

  const budget = (profile.budget || "").toLowerCase();
  if (budget && !budget.includes("no budget") && !budget.includes("not sure") && budget !== "") {
    score += 15;
    reasons.push("Specified budget range");
  }

  const med = (profile.medical_history || "").toLowerCase();
  if (med && med !== "none" && med !== "no" && med !== "nil") {
    score += 10;
    reasons.push("Existing medical conditions (high need)");
  }

  const insurer = (profile.existing_insurer || "").toLowerCase();
  const renewal = (profile.renewal_date || "").toLowerCase();
  if (insurer && insurer !== "none" && insurer !== "no" && insurer !== "") {
    score += 10;
    reasons.push("Has existing insurance (portability option)");
  }
  if (renewal && renewal !== "none" && renewal !== "no" && renewal !== "") {
    score += 10;
    reasons.push("Approaching renewal date");
  }

  if ((conversation.turnCount || 0) > 5) {
    score += 10;
    reasons.push("Highly engaged (longer call)");
  }
  if (conversation.quote) {
    score += 10;
    reasons.push("Received insurance quote");
  }
  if (conversation.transferredToHuman) {
    score += 15;
    reasons.push("Requested human advisor");
  }
  if (conversation.appointmentBooked) {
    score += 15;
    reasons.push("Booked an appointment");
  }

  score = Math.min(score, 100);

  let tier = LEAD_TIERS.COLD;
  if (score >= 70) tier = LEAD_TIERS.HOT;
  else if (score >= 40) tier = LEAD_TIERS.WARM;
  else if (score <= 10) tier = LEAD_TIERS.DEAD;

  return { score, tier, reasons };
}

// =============================================================================
// SECTION 7 — INTEGRATION UTILITIES
// =============================================================================

async function makeOutboundCall(env, { to, from, twimlUrl, statusCallback }) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio credentials not configured");
  }

  const bodyParams = new URLSearchParams({
    To: to,
    From: from,
    Url: twimlUrl,
    StatusCallback: statusCallback,
    StatusCallbackEvent: "completed,failed,no-answer,busy",
    Record: "true",
  });

  const basicAuth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twilio error ${data.code}: ${data.message}`);
  }
  return data;
}

async function startCallRecording(env, callSid) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return;
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ RecordingStatusCallbackEvent: "completed" }),
    });
    log.info("Call recording triggered", { callSid });
  } catch (err) {
    log.error("Failed to start call recording", { callSid, error: err.message });
  }
}

async function triggerWhatsAppByIntent(env, phone, intent, quote) {
  let docs = [];
  if (intent === INTENTS.RENEWAL) docs = ["brochure", "tax_benefit_guide"];
  else if (intent === INTENTS.CLAIMS) docs = ["claim_guide"];
  else if (intent === INTENTS.CASHLESS_HOSPITAL || intent === "hospital") docs = ["cashless_locator"];
  else if (intent === INTENTS.BUY_POLICY || intent === "buy") docs = ["brochure", "proposal_form", "kyc_upload"];
  else docs = ["brochure"];

  log.info("Triggering WhatsApp documents", { phone, intent, docs });
  const results = {};
  results.docs = await sendWhatsAppDocuments(env, phone, docs);
  if (quote && (intent === INTENTS.BUY_POLICY || intent === "buy")) {
    const quoteText = `${quote.planName} — Coverage: ${quote.coverage}, Premium: ${quote.premiumRange}`;
    results.quote = await sendQuoteSummary(env, phone, quoteText);
  }
  return results;
}

async function sendWhatsAppText(env, to, body) {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return { skipped: true };
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    });
    return { ok: resp.ok, status: resp.status };
  } catch (err) {
    log.error("WhatsApp text send failed", { error: err.message });
    return { ok: false, error: err.message };
  }
}

async function sendWhatsAppDocuments(env, phone, docs = ["brochure"]) {
  const lines = ["Hi, this is Asha from TATA AIG Health Insurance. Here are the requested documents:"];
  for (const doc of docs) {
    if (DOCUMENT_LINKS[doc]) lines.push(`• ${doc.replace(/_/g, " ").toUpperCase()}: ${DOCUMENT_LINKS[doc]}`);
  }
  return sendWhatsAppText(env, phone, lines.join("\n"));
}

async function sendQuoteSummary(env, phone, quoteText) {
  return sendWhatsAppText(env, phone, `Hi, this is Asha from TATA AIG Health Insurance. Your requested plan quotation details:\n${quoteText}`);
}

function findCashlessHospital(city) {
  const key = (city || "").toLowerCase().trim();
  const list = CASHLESS_NETWORK[key];
  if (!list) {
    return {
      found: false,
      message: `I don't have the network list for ${city} handy, but I will send our full Cashless Hospital Network locator booklet to your WhatsApp.`,
    };
  }
  return {
    found: true,
    hospitals: list,
    message: `In ${city}, our cashless network includes ${list.slice(0, 2).join(" and ")}, among other major hospitals.`,
  };
}

async function pushToSheets(env, row) {
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    log.info("Google Sheets CRM webhook not configured, skipping sync.");
    return { skipped: true };
  }
  try {
    const resp = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    log.info("CRM Sheets Sync Status", { status: resp.status });
    return { ok: resp.ok, status: resp.status };
  } catch (err) {
    log.error("Google Sheets CRM webhook failed", { error: err.message });
    return { ok: false, error: err.message };
  }
}

// =============================================================================
// SECTION 8 — THE STATE MACHINE (JS-owned call flow)
// =============================================================================

function computeNextStage(conversation, aiResult, speechResult) {
  const { stage, direction, missingFields, objectionCount, quote, turnCount } = conversation;

  if (turnCount >= CONFIG.MAX_TURNS) return STAGES.CLOSING;
  if (aiResult.wantsHuman) return STAGES.HUMAN_TRANSFER;
  if (EXPLICIT_END_REGEX.test(speechResult)) return STAGES.CLOSING;

  if (direction === CALL_DIRECTION.OUTBOUND) {
    switch (stage) {
      case STAGES.GREETING:
        return STAGES.PERMISSION;

      case STAGES.PERMISSION:
        if (PERMISSION_DENIED_REGEX.test(speechResult)) return STAGES.CLOSING;
        return STAGES.NEED_ANALYSIS;

      case STAGES.NEED_ANALYSIS:
        return STAGES.PROFILING;

      case STAGES.PROFILING:
        return missingFields.length === 0 ? STAGES.RECOMMENDATION : STAGES.PROFILING;

      case STAGES.RECOMMENDATION:
        return aiResult.objectionType ? STAGES.OBJECTION_HANDLING : STAGES.APPOINTMENT;

      case STAGES.OBJECTION_HANDLING:
        if (objectionCount + (aiResult.objectionType ? 1 : 0) >= CONFIG.MAX_OBJECTIONS) return STAGES.CLOSING;
        return aiResult.objectionType ? STAGES.OBJECTION_HANDLING : STAGES.APPOINTMENT;

      case STAGES.APPOINTMENT:
        return aiResult.extractedFields && aiResult.extractedFields.appointment_datetime ? STAGES.CLOSING : STAGES.APPOINTMENT;

      case STAGES.CLOSING:
        return STAGES.ENDED;

      default:
        return stage;
    }
  }

  // ----- Inbound flow -----
  switch (stage) {
    case STAGES.WELCOME:
    case STAGES.INTENT_SELECTION: {
      const intent = aiResult.detectedIntent && aiResult.detectedIntent !== INTENTS.UNKNOWN ? aiResult.detectedIntent : conversation.intent;
      return INTENT_TO_STAGE[intent] || STAGES.INTENT_SELECTION;
    }

    case STAGES.BUY_POLICY:
      if (missingFields.length === 0) return quote ? STAGES.RECOMMENDATION : STAGES.PROFILING;
      return STAGES.PROFILING;

    case STAGES.PROFILING:
      if (missingFields.length > 0) return STAGES.PROFILING;
      return STAGES.RECOMMENDATION;

    case STAGES.RECOMMENDATION:
      if (aiResult.objectionType) return STAGES.OBJECTION_HANDLING;
      return STAGES.APPOINTMENT;

    case STAGES.OBJECTION_HANDLING:
      if (objectionCount + (aiResult.objectionType ? 1 : 0) >= CONFIG.MAX_OBJECTIONS) return STAGES.CLOSING;
      return aiResult.objectionType ? STAGES.OBJECTION_HANDLING : STAGES.APPOINTMENT;

    case STAGES.APPOINTMENT:
      return aiResult.extractedFields && aiResult.extractedFields.appointment_datetime ? STAGES.CLOSING : STAGES.APPOINTMENT;

    case STAGES.RENEWAL:
    case STAGES.CLAIMS:
    case STAGES.HOSPITAL:
    case STAGES.POLICY_QUESTIONS:
      return stage;

    case STAGES.CLOSING:
      return STAGES.ENDED;

    default:
      return stage;
  }
}

// =============================================================================
// SECTION 9 — RECOMMENDATION ENGINE
// =============================================================================

const RECOMMENDATION_PLANS = [
  {
    id: "medicare_individual",
    name: "TATA AIG Medicare Individual Plan",
    minAge: 18,
    maxAge: 65,
    type: "individual",
    coverage: "₹5 Lakhs (Individual)",
    basePremium: (age) => (age < 30 ? 8000 : age < 45 ? 14000 : age < 60 ? 22000 : 32000),
    benefits: ["Individual hospitalization", "Pre & post hospital cover", "Ambulance ₹2,000", "No Claim Bonus 10%"],
  },
  {
    id: "medicare_family",
    name: "TATA AIG Medicare Family Floater Plan",
    minAge: 18,
    maxAge: 65,
    type: "family",
    coverage: "₹10 Lakhs (Family Floater)",
    basePremium: (age, members = 2) => {
      const base = age < 30 ? 8000 : age < 45 ? 14000 : age < 60 ? 22000 : 32000;
      return base * Math.max(1, members * 0.7);
    },
    benefits: ["Floater cover for spouse + kids", "Wellness & health checkups", "Maternity cover options", "No Claim Bonus"],
  },
  {
    id: "senior_citizen",
    name: "TATA AIG Senior Citizen Health Plan",
    minAge: 60,
    maxAge: 80,
    type: "individual",
    coverage: "₹5 Lakhs (Senior)",
    basePremium: (age) => (age < 70 ? 35000 : 45000),
    benefits: ["Covers pre-existing diseases after waiting period", "ICU and room rent covered", "Daily cash allowance"],
  },
  {
    id: "critical_illness",
    name: "TATA AIG Critical Illness Plan",
    minAge: 18,
    maxAge: 65,
    type: "individual",
    coverage: "₹10 Lakhs (Lump Sum)",
    basePremium: (age) => (age < 30 ? 5000 : age < 45 ? 9000 : age < 60 ? 15000 : 25000),
    benefits: ["Lump sum on diagnosis of 36 critical illnesses", "No hospitalisation required for payout"],
  },
  {
    id: "super_top_up",
    name: "TATA AIG Super Top-Up Plan",
    minAge: 18,
    maxAge: 75,
    type: "individual",
    coverage: "₹10 Lakhs (Top-Up)",
    basePremium: (age) => (age < 30 ? 3000 : age < 45 ? 5500 : age < 60 ? 9000 : 15000),
    benefits: ["Extra cover over base policy", "Extremely low affordable premiums"],
  },
];

function recommendPlan(customer) {
  const age = parseInt(customer.age, 10) || 30;
  const familySize = parseInt(customer.family_members, 10) || 1;
  const hasExisting = customer.existing_insurer && customer.existing_insurer !== "none" && customer.existing_insurer !== "no";
  const hasMed = customer.medical_history && customer.medical_history !== "none" && customer.medical_history !== "no";

  let bestPlan = RECOMMENDATION_PLANS[0];
  let reason = "Recommended base individual plan.";

  if (age >= 60) {
    bestPlan = RECOMMENDATION_PLANS.find((p) => p.id === "senior_citizen");
    reason = "Specialized plan covering senior citizen healthcare.";
  } else if (familySize > 1) {
    bestPlan = RECOMMENDATION_PLANS.find((p) => p.id === "medicare_family");
    reason = "Cost-effective family floater covering all family members.";
  } else if (hasExisting) {
    bestPlan = RECOMMENDATION_PLANS.find((p) => p.id === "super_top_up");
    reason = "High additional sum insured above your current policy deductible.";
  } else if (hasMed) {
    bestPlan = RECOMMENDATION_PLANS.find((p) => p.id === "medicare_individual");
    reason = "Medicare individual plan including pre-existing disease coverage.";
  }

  const rawPremium = bestPlan.id === "medicare_family" ? bestPlan.basePremium(age, familySize) : bestPlan.basePremium(age);

  return {
    planName: bestPlan.name,
    coverage: bestPlan.coverage,
    premiumRange: `₹${Math.round(rawPremium).toLocaleString("en-IN")}/year (approx.)`,
    benefits: bestPlan.benefits,
    reasoning: reason,
  };
}

// =============================================================================
// SECTION 10 — AI SERVICE (GEMINI + OPENAI FALLBACK, TIMEOUT-BOUNDED)
// =============================================================================

async function callGemini(env, prompt, systemPrompt = "") {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  let model = env.GEMINI_MODEL || CONFIG.GEMINI_MODEL;
  if (model === "gemini-2.5-flash" || !model) model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(env, prompt, systemPrompt = "") {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const baseUrl = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = env.OPENAI_MODEL || CONFIG.OPENAI_MODEL;

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 350 }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function generateAIResponse(env, prompt, systemPrompt = "") {
  try {
    if (env.GEMINI_API_KEY) return await callGemini(env, prompt, systemPrompt);
  } catch (err) {
    log.warn("Gemini AI fetch failed, attempting OpenAI fallback", { error: err.message });
  }
  try {
    if (env.OPENAI_API_KEY) return await callOpenAI(env, prompt, systemPrompt);
  } catch (err) {
    log.error("OpenAI fallback failed as well", { error: err.message });
  }
  throw new Error("No configured AI providers responded successfully.");
}

function extractJson(text) {
  try {
    const start = text.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(start, i + 1));
      }
    }
  } catch (e) {
    log.warn("Failed to extract JSON from AI response", { error: e.message });
  }
  return null;
}

function validateResponse(reply) {
  if (!reply || typeof reply !== "string" || reply.length === 0) {
    return "I'm sorry, could you please repeat that?";
  }
  let cleaned = reply.replace(/```json[\s\S]*?```/gi, "").replace(/```[\s\S]*?```/gi, "").replace(/\{[\s\S]*?\}/gi, "").trim();
  if (!cleaned || cleaned.includes("extractedFields") || cleaned.includes("spokenResponse")) {
    return "Thank you for sharing that. Could you tell me a bit more about your requirements?";
  }
  const banned = ["restaurant", "menu", "pizza", "burger", "food order", "kitchen", "recipe", "cooking"];
  const lower = cleaned.toLowerCase();
  if (banned.some((term) => lower.includes(term))) {
    return "I can only help with health insurance policies today — shall we continue with that?";
  }
  return cleaned.split(/(?<=[.?!])\s+/).slice(0, 2).join(" ");
}

function getLocalFallbackResponse(speech, stage) {
  const lower = (speech || "").toLowerCase();
  const isHindi = /kya|hai|haan|nahi|mujhe|polic|chahiye|tata|aig|batao|kaise|kitna|karo/i.test(lower);

  if (isHindi) {
    if (lower.includes("hospital") || lower.includes("cashless") || lower.includes("network")) {
      return "Humare paas 7,000 se zyada cashless hospitals hain, jaise Mumbai mein Lilavati aur Delhi mein Max. Main aapko poori list WhatsApp par bhej deti hoon.";
    }
    if (lower.includes("claim")) {
      return "Claim ke liye aap cashless process use kar sakte hain network hospital mein. Main WhatsApp par claim guide bhej deti hoon.";
    }
    if (lower.includes("price") || lower.includes("cost") || lower.includes("premium") || lower.includes("batao")) {
      return "Medicare plans ke premium lagbhag ₹8,000 se shuru hote hain. Main details WhatsApp par bhej deti hoon.";
    }
    if (lower.includes("human") || lower.includes("agent") || lower.includes("baat")) {
      return "Main abhi aapko humare human advisor se connect kar deti hoon. Ek minute rukiye.";
    }
    return "Mujhe maaf kijiye, humare servers mein temporary issue aa raha hai. Kya aap please repeat kar sakte hain?";
  }

  if (lower.includes("hospital") || lower.includes("cashless") || lower.includes("network")) {
    return "Our cashless network includes over 7,000 hospitals, including Lilavati in Mumbai and Max in Delhi. Let me send you the full list on WhatsApp.";
  }
  if (lower.includes("claims") || lower.includes("claim")) {
    return "For claim support, you can file cashless claims directly at the network hospital, or submit bills for reimbursement. I will send you our claim guide on WhatsApp.";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("premium") || lower.includes("expensive")) {
    return "Our premiums typically range from ₹8,000 for individuals to about ₹15,000 for families depending on age. I will send a quote sheet over to you on WhatsApp.";
  }
  if (lower.includes("human") || lower.includes("agent") || lower.includes("advisor") || lower.includes("representative")) {
    return "Connecting you to a human advisor now. Please hold.";
  }
  return "I apologize, but I am facing a temporary network issue. Could you please repeat that, or should I arrange for a representative to call you back?";
}

function buildLocalFallbackResult(conversation, speechResult) {
  return {
    extractedFields: {},
    detectedIntent: conversation.intent || INTENTS.UNKNOWN,
    intentConfidence: 0.4,
    objectionType: null,
    wantsHuman: TRANSFER_KEYWORDS.some((k) => speechResult.toLowerCase().includes(k)),
    spokenResponse: getLocalFallbackResponse(speechResult, conversation.stage),
    callSummary: conversation.summary || "",
  };
}

async function getTurnResponse(env, conversationState, speechResult) {
  const systemPrompt = buildAshaSystemPrompt(conversationState, conversationState.direction);
  const userPrompt = buildUserPrompt(speechResult, conversationState.history);

  const AI_TIMEOUT_MARKER = Symbol("timeout");
  const aiPromise = (async () => {
    const aiText = await generateAIResponse(env, userPrompt, systemPrompt);
    return extractJson(aiText);
  })().catch((err) => {
    log.error("AI turn generation failed", { error: err.message });
    return null;
  });

  const result = await withTimeout(aiPromise, CONFIG.AI_TIMEOUT_MS, AI_TIMEOUT_MARKER);

  if (result === AI_TIMEOUT_MARKER || !result || !result.spokenResponse) {
    if (result === AI_TIMEOUT_MARKER) log.warn("AI turn timed out, using rule-based fallback", { stage: conversationState.stage });
    return buildLocalFallbackResult(conversationState, speechResult);
  }

  result.spokenResponse = validateResponse(result.spokenResponse);
  result.extractedFields = result.extractedFields || {};
  return result;
}

// =============================================================================
// SECTION 11 — DATABASE CONTROLLER HELPERS
// =============================================================================

async function dbGetOrCreateCustomer(db, phone) {
  let cust = await db.prepare("SELECT * FROM customers WHERE phone = ?").bind(phone).first();
  if (!cust) {
    await db.prepare("INSERT INTO customers (phone) VALUES (?)").bind(phone).run();
    cust = await db.prepare("SELECT * FROM customers WHERE phone = ?").bind(phone).first();
  }
  return cust;
}

async function dbUpdateCustomer(db, phone, customerData) {
  const allFields = {
    name: customerData.name || null,
    email: customerData.email || null,
    age: customerData.age ? parseInt(customerData.age, 10) : null,
    city: customerData.city || null,
    pincode: customerData.pincode || null,
    family_members: customerData.family_members ? parseInt(customerData.family_members, 10) : null,
    existing_insurer: customerData.existing_insurer || null,
    renewal_date: customerData.renewal_date || null,
    medical_history: customerData.medical_history || null,
    coverage_needed: customerData.coverage_needed || null,
    budget: customerData.budget || null,
    buying_timeline: customerData.buying_timeline || null,
  };
  const entries = Object.entries(allFields).filter(([, v]) => v !== null);
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  await db.prepare(`UPDATE customers SET ${setClause} WHERE phone = ?`).bind(...values, phone).run();
}

async function dbLogConversationTurn(db, callSid, speaker, message, stage) {
  await db.prepare("INSERT INTO conversation_logs (call_sid, speaker, message, stage) VALUES (?, ?, ?, ?)").bind(callSid, speaker, message, stage).run();
}

async function dbSaveAppointment(env, customerId, phone, appointmentDatetime, notes) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO appointments (customer_id, phone, appointment_time, notes, status) VALUES (?, ?, ?, ?, 'scheduled')"
    ).bind(customerId || null, phone, appointmentDatetime, notes || "").run();
  } catch (e) {
    log.error("D1 save appointment error", { error: e.message });
  }
}

async function dbScheduleCallback(env, phone, reason, attemptCount = 1) {
  if (!env.DB) return;
  if (attemptCount > CONFIG.MAX_CALLBACK_ATTEMPTS) {
    log.info("Max callback attempts reached, not rescheduling", { phone, attemptCount });
    return;
  }
  const retryAt = new Date(Date.now() + CONFIG.CALLBACK_RETRY_MINUTES * 60 * 1000).toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO callbacks (phone, reason, attempt_count, retry_at, status) VALUES (?, ?, ?, ?, 'pending')"
    ).bind(phone, reason, attemptCount, retryAt).run();
  } catch (e) {
    log.error("D1 schedule callback error", { error: e.message });
  }
}

async function processDueCallbacks(env) {
  if (!env.DB || !env.TWILIO_FROM_NUMBER || !env.WORKER_ORIGIN) {
    log.warn("processDueCallbacks skipped: missing DB, TWILIO_FROM_NUMBER, or WORKER_ORIGIN binding/var");
    return;
  }
  const due = await env.DB.prepare(
    "SELECT * FROM callbacks WHERE status = 'pending' AND retry_at <= CURRENT_TIMESTAMP LIMIT 20"
  ).all();

  for (const row of due.results || []) {
    try {
      await makeOutboundCall(env, {
        to: row.phone,
        from: env.TWILIO_FROM_NUMBER,
        twimlUrl: `${env.WORKER_ORIGIN}/voice/incoming`,
        statusCallback: `${env.WORKER_ORIGIN}/voice/status`,
      });
      await env.DB.prepare("UPDATE callbacks SET status = 'dialed' WHERE id = ?").bind(row.id).run();
    } catch (e) {
      log.error("Retry outbound call failed", { phone: row.phone, error: e.message });
      await env.DB.prepare("UPDATE callbacks SET status = 'failed' WHERE id = ?").bind(row.id).run();
    }
  }
}

async function syncCRMAndWhatsApp(env, conversation, callSid) {
  try {
    const customer = conversation.customer;
    let customerId = null;

    if (env.DB) {
      const custRow = await env.DB.prepare("SELECT id FROM customers WHERE phone = ?").bind(customer.phone).first();
      if (custRow) {
        customerId = custRow.id;
        await env.DB.prepare("UPDATE customers SET name = ?, email = ? WHERE id = ?").bind(customer.name || null, customer.email || null, customerId).run();
      }
    }

    const scoring = calculateLeadScoreAndTier(conversation);

    if (env.DB && customerId) {
      try {
        const existing = await env.DB.prepare("SELECT id FROM lead_scores WHERE customer_id = ?").bind(customerId).first();
        if (existing) {
          await env.DB.prepare("UPDATE lead_scores SET score = ?, tier = ?, reasons = ? WHERE id = ?").bind(scoring.score, scoring.tier, scoring.reasons.join("; "), existing.id).run();
        } else {
          await env.DB.prepare("INSERT INTO lead_scores (customer_id, score, tier, reasons) VALUES (?, ?, ?, ?)").bind(customerId, scoring.score, scoring.tier, scoring.reasons.join("; ")).run();
        }
      } catch (e) {
        log.error("D1 save lead score error", { error: e.message });
      }
    }

    let callDuration = 0;
    let recordingUrl = "";
    if (env.DB) {
      const callRow = await env.DB.prepare("SELECT call_duration FROM voice_calls WHERE call_sid = ?").bind(callSid).first();
      callDuration = callRow?.call_duration || 0;
    }
    if (conversation.recordingUrl) recordingUrl = conversation.recordingUrl;

    const leadData = {
      customerName: customer.name || "Unknown",
      phone: customer.phone,
      email: customer.email || "",
      age: customer.age || "",
      city: customer.city || "",
      tier: scoring.tier,
      score: scoring.score,
      intent: conversation.intent || "",
      direction: conversation.direction || "",
      budget: customer.budget || "",
      coverage: customer.coverage_needed || "",
      medicalHistory: customer.medical_history || "",
      existingInsurer: customer.existing_insurer || "",
      renewalDate: customer.renewal_date || "",
      buyingTimeline: customer.buying_timeline || "",
      conversationSummary: conversation.summary || "",
      callDuration,
      recordingUrl,
      whatsappSent: conversation.whatsappSent ? "yes" : "no",
      transferredToHuman: conversation.transferredToHuman ? "yes" : "no",
      appointmentBooked: conversation.appointmentBooked ? "yes" : "no",
    };

    await pushToSheets(env, leadData);

    if (!conversation.whatsappSent) {
      await triggerWhatsAppByIntent(env, customer.phone, conversation.intent, conversation.quote);
      conversation.whatsappSent = true;
      if (env.DB) {
        await env.DB.prepare("UPDATE voice_calls SET session_data = ? WHERE call_sid = ?").bind(JSON.stringify(conversation), callSid).run();
      }
    }
  } catch (err) {
    log.error("syncCRMAndWhatsApp failed", { error: err.message });
  }
}

// =============================================================================
// SECTION 12 — SHARED TURN PROCESSOR
// =============================================================================

async function processTurn(env, conversation, rawSpeech, callSid, callRow) {
  const speechResult = sanitizeSpeech(rawSpeech);
  conversation.history.push({ role: "customer", text: speechResult });
  conversation.turnCount = (conversation.turnCount || 0) + 1;

  if (env.DB) {
    try {
      await dbLogConversationTurn(env.DB, callSid, "customer", speechResult, conversation.stage);
    } catch (e) {
      log.error("D1 log customer turn error", { error: e.message });
    }
  }

  const speechLower = speechResult.toLowerCase();
  const matchedTransferKeyword = TRANSFER_KEYWORDS.find((k) => speechLower.includes(k));

  if (matchedTransferKeyword) {
    conversation.stage = STAGES.HUMAN_TRANSFER;
    conversation.transferredToHuman = true;
    const replyText = "Sure, let me connect you to a human advisor now. Please hold.";
    conversation.history.push({ role: "asha", text: replyText });

    if (env.DB) {
      try {
        await env.DB.prepare("UPDATE voice_calls SET stage = ?, session_data = ? WHERE call_sid = ?").bind(conversation.stage, JSON.stringify(conversation), callSid).run();
        await dbLogConversationTurn(env.DB, callSid, "asha", replyText, STAGES.HUMAN_TRANSFER);
      } catch (e) {
        log.error("D1 transfer save error", { error: e.message });
      }
    }

    return { conversation, replyText, isEnding: true, wantsHuman: true, aiResult: null };
  }

  const aiResult = await getTurnResponse(env, conversation, speechResult);

  for (const [key, value] of Object.entries(aiResult.extractedFields || {})) {
    if (value !== null && value !== undefined && value !== "") {
      conversation.customer[key] = value;
    }
  }
  conversation.missingFields = getMissingFields(conversation.customer);

  if (conversation.customer.age && conversation.customer.family_members && !conversation.quote) {
    conversation.quote = recommendPlan(conversation.customer);
    if (env.DB && callRow && callRow.customer_id) {
      try {
        await env.DB.prepare("INSERT INTO insurance_quotes (customer_id, plan_name, coverage_amount, premium_estimate) VALUES (?, ?, ?, ?)")
          .bind(callRow.customer_id, conversation.quote.planName, conversation.quote.coverage, conversation.quote.premiumRange)
          .run();
      } catch (e) {
        log.error("D1 quote save error", { error: e.message });
      }
    }
  }

  if (aiResult.detectedIntent && aiResult.detectedIntent !== INTENTS.UNKNOWN) conversation.intent = aiResult.detectedIntent;
  if (aiResult.callSummary) conversation.summary = aiResult.callSummary;
  if (aiResult.objectionType) conversation.objectionCount = (conversation.objectionCount || 0) + 1;

  // JS state machine controls stage transition
  conversation.stage = computeNextStage(conversation, aiResult, speechResult);

  const appointmentDatetime = aiResult.extractedFields && aiResult.extractedFields.appointment_datetime;
  if (appointmentDatetime && !conversation.appointmentBooked) {
    conversation.appointmentBooked = true;
    if (env.DB) {
      await dbSaveAppointment(env, callRow && callRow.customer_id, conversation.customer.phone, appointmentDatetime, conversation.summary);
    }
  }

  if (env.DB) {
    try {
      await dbUpdateCustomer(env.DB, conversation.customer.phone, conversation.customer);
    } catch (e) {
      log.error("D1 customer update error", { error: e.message });
    }
  }

  const replyText = aiResult.spokenResponse;
  conversation.history.push({ role: "asha", text: replyText });
  conversation.lastQuestion = replyText;

  if (env.DB) {
    try {
      await env.DB.prepare("UPDATE voice_calls SET stage = ?, session_data = ? WHERE call_sid = ?").bind(conversation.stage, JSON.stringify(conversation), callSid).run();
      await dbLogConversationTurn(env.DB, callSid, "asha", replyText, conversation.stage);
    } catch (e) {
      log.error("D1 log reply turn error", { error: e.message });
    }
  }

  const isEnding = conversation.stage === STAGES.ENDED;
  return { conversation, replyText, isEnding, wantsHuman: false, aiResult };
}

function buildInitialConversation(direction, phone, customer) {
  const missingFields = getMissingFields(customer);
  return {
    direction,
    intent: direction === CALL_DIRECTION.OUTBOUND ? INTENTS.BUY_POLICY : INTENTS.UNKNOWN,
    history: [],
    customer: {
      phone,
      name: customer.name || "",
      email: customer.email || "",
      age: customer.age || null,
      city: customer.city || "",
      pincode: customer.pincode || "",
      family_members: customer.family_members || null,
      existing_insurer: customer.existing_insurer || "",
      renewal_date: customer.renewal_date || "",
      medical_history: customer.medical_history || "",
      coverage_needed: customer.coverage_needed || "",
      budget: customer.budget || "",
      buying_timeline: customer.buying_timeline || "",
    },
    missingFields,
    summary: "",
    lastQuestion: "",
    stage: direction === CALL_DIRECTION.OUTBOUND ? STAGES.GREETING : STAGES.WELCOME,
    objectionCount: 0,
    quote: null,
    whatsappSent: false,
    transferredToHuman: false,
    appointmentBooked: false,
    turnCount: 0,
  };
}

function buildGreeting(direction) {
  return direction === CALL_DIRECTION.OUTBOUND
    ? "Hello! This is Asha, your AI voice assistant from TATA AIG Health Insurance. Am I speaking with the right person regarding your health insurance needs?"
    : "Thank you for calling TATA AIG Health Insurance. My name is Asha. How can I help you today?";
}

// =============================================================================
// SECTION 13 — ENDPOINT ROUTING
// =============================================================================

async function handleDashboard(request, env) {
  let calls = [];
  let stats = {
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    avgDuration: 0,
    hotLeads: 0,
    warmLeads: 0,
    appointments: 0,
    quotesSent: 0,
    transfers: 0,
  };

  if (env.DB) {
    try {
      const callsResult = await env.DB.prepare("SELECT * FROM voice_calls ORDER BY started_at DESC LIMIT 50").all();
      calls = callsResult.results || [];

      const [totalCallsQuery, answeredQuery, missedQuery, avgDurationQuery, hotQuery, warmQuery, appointmentsQuery, quotesQuery, transfersQueryLogs] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as count FROM voice_calls").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM voice_calls WHERE status = 'completed' AND call_duration > 0").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM voice_calls WHERE status IN ('failed', 'no-answer', 'busy')").first(),
        env.DB.prepare("SELECT AVG(call_duration) as avg FROM voice_calls WHERE call_duration IS NOT NULL AND call_duration > 0").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM lead_scores WHERE tier = 'hot'").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM lead_scores WHERE tier = 'warm'").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM appointments").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM insurance_quotes").first(),
        env.DB.prepare("SELECT COUNT(DISTINCT call_sid) as count FROM conversation_logs WHERE stage = 'human_transfer'").first(),
      ]);

      stats.totalCalls = totalCallsQuery?.count || 0;
      stats.answeredCalls = answeredQuery?.count || 0;
      stats.missedCalls = missedQuery?.count || 0;
      stats.avgDuration = Math.round(avgDurationQuery?.avg || 0);
      stats.hotLeads = hotQuery?.count || 0;
      stats.warmLeads = warmQuery?.count || 0;
      stats.appointments = appointmentsQuery?.count || 0;
      stats.quotesSent = quotesQuery?.count || 0;
      stats.transfers = transfersQueryLogs?.count || 0;
    } catch (dbErr) {
      log.error("Dashboard database queries failed", { error: dbErr.message });
    }
  }

  const html = getDashboardHtml(stats, calls);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

async function handleTestCall(request, env) {
  try {
    const { to } = await request.json();
    if (!to) return new Response(JSON.stringify({ error: "Missing 'to' phone number" }), { status: 400 });

    const origin = new URL(request.url).origin;
    const result = await makeOutboundCall(env, {
      to,
      from: env.TWILIO_FROM_NUMBER,
      twimlUrl: `${origin}/voice/incoming`,
      statusCallback: `${origin}/voice/status`,
    });

    return new Response(JSON.stringify({ success: true, callSid: result.sid }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

const routeCallIncoming = requireTwilioSignature(async (form, request, env, ctx) => {
  const callSid = form.get("CallSid") || "";
  const fromNum = form.get("From") || "";
  const toNum = form.get("To") || "";
  const twilioDirection = form.get("Direction") || "";
  const origin = new URL(request.url).origin;

  if (!callSid || !fromNum) {
    return new Response("Bad Request", { status: 400 });
  }

  let direction = CALL_DIRECTION.INBOUND;
  if (twilioDirection.includes("outbound") || fromNum === env.TWILIO_FROM_NUMBER) {
    direction = CALL_DIRECTION.OUTBOUND;
  }

  let customer = { phone: fromNum };
  if (env.DB) {
    try {
      customer = await dbGetOrCreateCustomer(env.DB, fromNum);
    } catch (e) {
      log.error("D1 customer load error", { error: e.message });
    }
  }

  const conversation = buildInitialConversation(direction, fromNum, customer);

  if (env.DB) {
    try {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO voice_calls (call_sid, phone, customer_id, status, stage, profiling_index, session_data) VALUES (?, ?, ?, 'in_progress', ?, 0, ?)"
      ).bind(callSid, fromNum, customer.id || null, conversation.stage, JSON.stringify(conversation)).run();
    } catch (e) {
      log.error("D1 call insert error", { error: e.message });
    }
  }

  if (direction === CALL_DIRECTION.INBOUND) {
    ctx.waitUntil(startCallRecording(env, callSid));
  }

  const greeting = buildGreeting(direction);
  conversation.lastQuestion = greeting;
  conversation.history.push({ role: "asha", text: greeting });
  conversation.turnCount = 1;

  if (env.DB) {
    try {
      await env.DB.prepare("UPDATE voice_calls SET session_data = ? WHERE call_sid = ?").bind(JSON.stringify(conversation), callSid).run();
      await dbLogConversationTurn(env.DB, callSid, "asha", greeting, conversation.stage);
    } catch (e) {
      log.error("D1 update call error", { error: e.message });
    }
  }

  return sayAndGather({ text: greeting, actionUrl: `${origin}/voice/gather`, language: env.GATHER_LANGUAGE || CONFIG.GATHER_LANGUAGE });
});

const routeCallGather = requireTwilioSignature(async (form, request, env, ctx) => {
  const callSid = form.get("CallSid") || "";
  const speechResult = (form.get("SpeechResult") || "").trim();
  const digitsResult = (form.get("Digits") || "").trim();
  const origin = new URL(request.url).origin;

  const inputResult = speechResult || digitsResult;
  if (!callSid) return new Response("Bad Request", { status: 400 });

  if (!inputResult) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${origin}/voice/fallback?callSid=${encodeURIComponent(callSid)}</Redirect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  let callRow = null;
  if (env.DB) {
    try {
      callRow = await env.DB.prepare("SELECT * FROM voice_calls WHERE call_sid = ?").bind(callSid).first();
    } catch (e) {
      log.error("D1 select call error", { error: e.message });
    }
  }

  if (!callRow) {
    return sayAndHangup({ text: "I'm sorry, I couldn't find your active call session. Please try calling back later." });
  }

  const conversation = JSON.parse(callRow.session_data || "{}");
  const { replyText, isEnding, wantsHuman } = await processTurn(env, conversation, inputResult, callSid, callRow);

  if (wantsHuman) {
    ctx.waitUntil(syncCRMAndWhatsApp(env, conversation, callSid));
    return sayAndDial({ text: replyText, dialNumber: env.HUMAN_TRANSFER_NUMBER });
  }

  if (isEnding) {
    ctx.waitUntil(syncCRMAndWhatsApp(env, conversation, callSid));
    return sayAndHangup({ text: replyText });
  }

  return sayAndGather({ text: replyText, actionUrl: `${origin}/voice/gather`, language: env.GATHER_LANGUAGE || CONFIG.GATHER_LANGUAGE });
});

const handleCallStatus = requireTwilioSignature(async (form, request, env, ctx) => {
  const callSid = form.get("CallSid") || "";
  const duration = parseInt(form.get("CallDuration") || "0", 10);
  const callStatus = form.get("CallStatus") || "";
  const recordingUrl = form.get("RecordingUrl") || "";

  if (env.DB) {
    try {
      await env.DB.prepare("UPDATE voice_calls SET status = ?, call_duration = ?, ended_at = CURRENT_TIMESTAMP WHERE call_sid = ?").bind(callStatus, duration, callSid).run();

      const callRow = await env.DB.prepare("SELECT session_data, phone FROM voice_calls WHERE call_sid = ?").bind(callSid).first();
      if (callRow?.session_data) {
        const conversation = JSON.parse(callRow.session_data);
        conversation.recordingUrl = recordingUrl;
        conversation.callDuration = duration;

        await env.DB.prepare("UPDATE voice_calls SET session_data = ? WHERE call_sid = ?").bind(JSON.stringify(conversation), callSid).run();

        if (conversation.direction === CALL_DIRECTION.OUTBOUND && (callStatus === "no-answer" || callStatus === "busy")) {
          ctx.waitUntil(dbScheduleCallback(env, callRow.phone, callStatus, 1));
        } else {
          ctx.waitUntil(syncCRMAndWhatsApp(env, conversation, callSid));
        }
      }
    } catch (e) {
      log.error("D1 update status error", { error: e.message });
    }
  }

  return new Response("OK", { status: 200 });
});

const handleCallFallback = requireTwilioSignature(async (form, request, env, ctx) => {
  const url = new URL(request.url);
  const callSid = url.searchParams.get("callSid") || "";
  const origin = url.origin;

  log.info("Call fallback triggered", { callSid });

  return sayAndGather({
    text: "Sorry, I couldn't hear that clearly. Could you please repeat what you said?",
    actionUrl: `${origin}/voice/gather`,
    language: env.GATHER_LANGUAGE || CONFIG.GATHER_LANGUAGE,
  });
});

async function handleEnhancedHealth(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const t0 = Date.now();
  const result = {
    worker: "ok",
    version: "3.0.0",
    agent: env.AGENT_NAME || CONFIG.AGENT_NAME,
    model: env.GEMINI_MODEL || CONFIG.GEMINI_MODEL,
    environment: env.ENVIRONMENT || "production",
    services: { db: "unknown", gemini: "unknown" },
    latencyMs: 0,
  };
  if (env.DB) {
    try {
      await env.DB.prepare("SELECT 1").first();
      result.services.db = "ok";
    } catch {
      result.services.db = "error";
    }
  } else {
    result.services.db = "not_bound";
  }
  result.services.gemini = env.GEMINI_API_KEY ? "configured" : "not_configured";
  if (env.OPENAI_API_KEY) result.services.openai = "configured";
  if (env.TWILIO_ACCOUNT_SID) result.services.twilio = "configured";
  if (env.WHATSAPP_TOKEN) result.services.whatsapp = "configured";
  result.services.twilioSignatureValidation = env.SKIP_TWILIO_VALIDATION === "true" ? "disabled" : "enabled";
  result.latencyMs = Date.now() - t0;
  return jsonResponse(result, 200, reqOrigin);
}

async function handleApiStatus(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  let activeSessions = 0, totalCustomers = 0, dbStatus = "unknown";
  if (env.DB) {
    try {
      const [sess, cust] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as c FROM voice_calls WHERE status = 'in_progress'").first(),
        env.DB.prepare("SELECT COUNT(*) as c FROM customers").first(),
      ]);
      activeSessions = sess?.c || 0;
      totalCustomers = cust?.c || 0;
      dbStatus = "ok";
    } catch {
      dbStatus = "error";
    }
  }
  return jsonResponse(
    {
      status: "ok",
      activeSessions,
      totalCustomers,
      db: dbStatus,
      gemini: env.GEMINI_API_KEY ? "configured" : "missing",
      openai: env.OPENAI_API_KEY ? "configured" : "not_set",
      whatsapp: env.WHATSAPP_TOKEN ? "configured" : "not_set",
      twilio: env.TWILIO_ACCOUNT_SID ? "configured" : "not_set",
    },
    200,
    reqOrigin
  );
}

function handleApiConfig(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  return jsonResponse(
    {
      agentName: env.AGENT_NAME || CONFIG.AGENT_NAME,
      companyName: env.COMPANY_NAME || CONFIG.COMPANY_NAME,
      model: env.GEMINI_MODEL || CONFIG.GEMINI_MODEL,
      language: env.GATHER_LANGUAGE || CONFIG.GATHER_LANGUAGE,
      stages: Object.values(STAGES),
      intents: Object.values(INTENTS),
      plans: RECOMMENDATION_PLANS.map((p) => ({ id: p.id, name: p.name, coverage: p.coverage })),
      cashlessNetworkCities: Object.keys(CASHLESS_NETWORK),
      maxTurns: CONFIG.MAX_TURNS,
    },
    200,
    reqOrigin
  );
}

async function handleApiSessionGet(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  const sessionId = url.pathname.split("/").pop();
  if (!sessionId) return jsonResponse({ error: "Missing session ID" }, 400, reqOrigin);
  if (!env.DB) return jsonResponse({ error: "DB not available" }, 503, reqOrigin);
  const row = await env.DB.prepare("SELECT * FROM voice_calls WHERE call_sid = ?").bind(sessionId).first();
  if (!row) return jsonResponse({ error: "Session not found" }, 404, reqOrigin);
  let sessionData = {};
  try {
    sessionData = JSON.parse(row.session_data || "{}");
  } catch {}
  return jsonResponse(
    {
      sessionId: row.call_sid,
      phone: row.phone,
      status: row.status,
      stage: row.stage,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      duration: row.call_duration,
      customer: sessionData.customer || null,
      missingFields: sessionData.missingFields || [],
      summary: sessionData.summary || "",
      quote: sessionData.quote || null,
      turnCount: sessionData.turnCount || 0,
      intent: sessionData.intent || null,
      feedback: sessionData.feedback || null,
      appointmentBooked: sessionData.appointmentBooked || false,
    },
    200,
    reqOrigin
  );
}

async function handleApiSessionEnd(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const { sessionId } = body;
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400, reqOrigin);
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT session_data FROM voice_calls WHERE call_sid = ?").bind(sessionId).first();
      if (row) {
        let session = {};
        try {
          session = JSON.parse(row.session_data || "{}");
        } catch {}
        session.stage = STAGES.ENDED;
        await env.DB.prepare("UPDATE voice_calls SET status = 'completed', stage = ?, ended_at = CURRENT_TIMESTAMP, session_data = ? WHERE call_sid = ?").bind(STAGES.ENDED, JSON.stringify(session), sessionId).run();
      }
    } catch (e) {
      log.error("Session end error", { error: e.message });
    }
  }
  return jsonResponse({ ok: true, sessionId, stage: STAGES.ENDED }, 200, reqOrigin);
}

async function handleApiCustomerGet(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  const phone = decodeURIComponent(url.pathname.split("/").pop());
  if (!phone) return jsonResponse({ error: "Missing phone" }, 400, reqOrigin);
  if (!env.DB) return jsonResponse({ error: "DB not available" }, 503, reqOrigin);
  const customer = await env.DB.prepare("SELECT * FROM customers WHERE phone = ?").bind(phone).first();
  if (!customer) return jsonResponse({ error: "Customer not found" }, 404, reqOrigin);
  const [calls, quotes, leadScore, appointments] = await Promise.all([
    env.DB.prepare("SELECT call_sid, status, stage, call_duration, started_at FROM voice_calls WHERE phone = ? ORDER BY started_at DESC LIMIT 10").bind(phone).all(),
    env.DB.prepare("SELECT * FROM insurance_quotes WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5").bind(customer.id).all(),
    env.DB.prepare("SELECT score, tier, reasons FROM lead_scores WHERE customer_id = ?").bind(customer.id).first(),
    env.DB.prepare("SELECT * FROM appointments WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5").bind(customer.id).all(),
  ]);
  return jsonResponse(
    {
      customer,
      recentCalls: calls.results || [],
      quotes: quotes.results || [],
      leadScore: leadScore || null,
      appointments: appointments.results || [],
    },
    200,
    reqOrigin
  );
}

async function handleApiHistory(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  const sessionId = url.pathname.split("/").pop();
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400, reqOrigin);
  if (!env.DB) return jsonResponse({ error: "DB not available" }, 503, reqOrigin);
  const logs = await env.DB.prepare("SELECT speaker, message, stage, created_at FROM conversation_logs WHERE call_sid = ? ORDER BY created_at ASC").bind(sessionId).all();
  return jsonResponse({ sessionId, turns: logs.results || [] }, 200, reqOrigin);
}

async function handleApiAnalytics(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  if (!env.DB) return jsonResponse({ error: "DB not available" }, 503, reqOrigin);
  const [total, completed, failed, hot, warm, cold, avgDur, quotes, appointments, transfers, stageDist] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as c FROM voice_calls").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM voice_calls WHERE status = 'completed'").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM voice_calls WHERE status IN ('failed','no-answer','busy')").first(),
    env.DB.prepare("SELECT AVG(call_duration) as a FROM voice_calls WHERE call_duration > 0").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM lead_scores WHERE tier = 'hot'").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM lead_scores WHERE tier = 'warm'").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM lead_scores WHERE tier = 'cold'").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM insurance_quotes").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM appointments").first(),
    env.DB.prepare("SELECT COUNT(DISTINCT call_sid) as c FROM conversation_logs WHERE stage = 'human_transfer'").first(),
    env.DB.prepare("SELECT stage, COUNT(*) as count FROM voice_calls GROUP BY stage ORDER BY count DESC").all(),
  ]);
  return jsonResponse(
    {
      totalCalls: total?.c || 0,
      completedCalls: completed?.c || 0,
      failedCalls: failed?.c || 0,
      avgDurationSec: Math.round(avgDur?.a || 0),
      leadScores: { hot: hot?.c || 0, warm: warm?.c || 0, cold: cold?.c || 0 },
      quotesSent: quotes?.c || 0,
      appointments: appointments?.c || 0,
      humanTransfers: transfers?.c || 0,
      stageDistribution: stageDist.results || [],
    },
    200,
    reqOrigin
  );
}

async function handleApiFeedback(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const { sessionId, rating, comment } = body;
  if (!sessionId || rating === undefined) return jsonResponse({ error: "sessionId and rating are required" }, 400, reqOrigin);
  if (rating < 1 || rating > 5) return jsonResponse({ error: "rating must be 1-5" }, 400, reqOrigin);
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT session_data FROM voice_calls WHERE call_sid = ?").bind(sessionId).first();
      if (row) {
        let session = {};
        try {
          session = JSON.parse(row.session_data || "{}");
        } catch {}
        session.feedback = { rating, comment: comment || "", submittedAt: new Date().toISOString() };
        await env.DB.prepare("UPDATE voice_calls SET session_data = ? WHERE call_sid = ?").bind(JSON.stringify(session), sessionId).run();
      }
    } catch (e) {
      log.error("Feedback save error", { error: e.message });
    }
  }
  return jsonResponse({ ok: true, sessionId, rating }, 200, reqOrigin);
}

function requireDevEnvironment(env, reqOrigin) {
  if ((env.ENVIRONMENT || "production") !== "development") {
    return jsonResponse({ error: "Available in development only" }, 403, reqOrigin);
  }
  return null;
}

function handleDebugRoutes(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const denied = requireDevEnvironment(env, reqOrigin);
  if (denied) return denied;
  return jsonResponse(
    {
      routes: [
        "GET /",
        "GET /health",
        "GET /api/health",
        "GET /api/status",
        "GET /api/config",
        "GET /api/session/:id",
        "POST /api/session/end",
        "GET /api/customer/:phone",
        "GET /api/history/:sessionId",
        "GET /api/analytics",
        "POST /api/feedback",
        "GET /api/db/:table",
        "POST /voice/browser-session",
        "POST /voice/browser-turn",
        "POST /voice/incoming",
        "POST /voice/gather",
        "POST /voice/status",
        "POST /voice/fallback",
        "POST /test-call",
        "GET /api/debug/routes",
        "GET /api/debug/env",
      ],
    },
    200,
    reqOrigin
  );
}

function handleDebugEnv(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const denied = requireDevEnvironment(env, reqOrigin);
  if (denied) return denied;
  return jsonResponse(
    {
      ENVIRONMENT: env.ENVIRONMENT,
      AGENT_NAME: env.AGENT_NAME,
      COMPANY_NAME: env.COMPANY_NAME,
      GATHER_LANGUAGE: env.GATHER_LANGUAGE,
      GEMINI_MODEL: env.GEMINI_MODEL,
      hasGeminiKey: !!env.GEMINI_API_KEY,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      hasTwilio: !!env.TWILIO_ACCOUNT_SID,
      hasWhatsApp: !!env.WHATSAPP_TOKEN,
      hasDB: !!env.DB,
      hasSheetsWebhook: !!env.GOOGLE_SHEETS_WEBHOOK_URL,
      twilioSignatureValidation: env.SKIP_TWILIO_VALIDATION === "true" ? "disabled" : "enabled",
    },
    200,
    reqOrigin
  );
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status = 200, reqOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(reqOrigin) },
  });
}

// ---- Browser test API ----

async function handleBrowserSession(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const direction = body.direction || CALL_DIRECTION.OUTBOUND;
  const phone = body.phone || "+916000000000";
  const sessionId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let customer = { phone };
  if (env.DB) {
    try {
      customer = await dbGetOrCreateCustomer(env.DB, phone);
    } catch {}
  }

  const conversation = buildInitialConversation(direction, phone, customer);
  const greeting = buildGreeting(direction);
  conversation.lastQuestion = greeting;
  conversation.history.push({ role: "asha", text: greeting });
  conversation.turnCount = 1;

  if (env.DB) {
    try {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO voice_calls (call_sid, phone, customer_id, status, stage, profiling_index, session_data) VALUES (?, ?, ?, 'in_progress', ?, 0, ?)"
      ).bind(sessionId, phone, customer.id || null, conversation.stage, JSON.stringify(conversation)).run();
      await dbLogConversationTurn(env.DB, sessionId, "asha", greeting, conversation.stage);
    } catch {}
  }

  return jsonResponse(
    {
      sessionId,
      greeting,
      stage: conversation.stage,
      direction,
      customer: conversation.customer,
      missingFields: conversation.missingFields,
      model: env.GEMINI_MODEL || CONFIG.GEMINI_MODEL,
    },
    200,
    reqOrigin
  );
}

async function handleBrowserTurn(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const { sessionId, speechResult } = body;
  if (!sessionId || !speechResult) return jsonResponse({ error: "Missing sessionId or speechResult" }, 400, reqOrigin);

  let callRow = null;
  if (env.DB) {
    try {
      callRow = await env.DB.prepare("SELECT * FROM voice_calls WHERE call_sid = ?").bind(sessionId).first();
    } catch {}
  }
  if (!callRow) return jsonResponse({ error: "Session not found" }, 404, reqOrigin);

  const conversation = JSON.parse(callRow.session_data || "{}");
  const t0 = Date.now();

  const { replyText, isEnding, wantsHuman, aiResult } = await processTurn(env, conversation, speechResult, sessionId, callRow);

  if (isEnding || wantsHuman) {
    await syncCRMAndWhatsApp(env, conversation, sessionId);
  }

  return jsonResponse(
    {
      spokenResponse: replyText,
      stage: conversation.stage,
      ended: isEnding,
      detectedIntent: aiResult ? aiResult.detectedIntent : conversation.intent,
      intentConfidence: aiResult ? aiResult.intentConfidence : null,
      objectionType: aiResult ? aiResult.objectionType : null,
      wantsHuman,
      extractedFields: aiResult ? aiResult.extractedFields : {},
      customer: conversation.customer,
      missingFields: conversation.missingFields,
      quote: conversation.quote,
      summary: conversation.summary,
      turnCount: conversation.turnCount,
      latencyMs: Date.now() - t0,
      model: env.GEMINI_MODEL || CONFIG.GEMINI_MODEL,
    },
    200,
    reqOrigin
  );
}

async function handleApiDb(request, env) {
  const reqOrigin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  const table = url.pathname.split("/").pop();
  const allowed = ["customers", "voice_calls", "conversation_logs", "insurance_quotes", "lead_scores", "appointments", "callbacks"];
  if (!allowed.includes(table)) return jsonResponse({ error: "Table not allowed" }, 403, reqOrigin);

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  let rows = [];
  let total = 0;
  if (env.DB) {
    try {
      const countRes = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${table}`).first();
      total = countRes?.c || 0;
      const result = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
      rows = result.results || [];
      if (search) rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
    } catch (e) {
      return jsonResponse({ error: e.message }, 500, reqOrigin);
    }
  }
  return jsonResponse({ rows, total, page, limit }, 200, reqOrigin);
}

// =============================================================================
// SECTION 14 — DASHBOARD HTML
// =============================================================================

function getDashboardHtml(stats, calls) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TATA AIG Voice Agent Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0f172a;
      --bg-card: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --error: #ef4444;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: var(--bg-main); color: var(--text-main); font-family: 'Inter', sans-serif; padding: 2rem; line-height: 1.5; }
    h1, h2, h3 { font-family: 'Outfit', sans-serif; font-weight: 600; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    .header h1 { font-size: 2rem; background: linear-gradient(135deg, #60a5fa, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 0.75rem; }
    .status-badge { display: flex; align-items: center; gap: 0.5rem; background-color: var(--success-glow); color: var(--success); padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(16, 185, 129, 0.2); }
    .pulse-dot { width: 8px; height: 8px; background-color: var(--success); border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(0.9); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.6; } }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; position: relative; overflow: hidden; transition: transform 0.2s, border-color 0.2s; }
    .stat-card:hover { transform: translateY(-2px); border-color: var(--accent); }
    .stat-label { color: var(--text-muted); font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 2.25rem; font-weight: 700; font-family: 'Outfit', sans-serif; }
    .stat-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
    .card { background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
    .card-title { font-size: 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; padding: 1rem; border-bottom: 2px solid var(--border); text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 1rem; border-bottom: 1px solid var(--border); font-size: 0.9375rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background-color: rgba(255, 255, 255, 0.02); }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-inbound { background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .badge-outbound { background-color: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .badge-completed { background-color: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge-failed { background-color: rgba(239, 68, 68, 0.15); color: #f87171; }
    .badge-progress { background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .btn-audio { display: inline-flex; align-items: center; gap: 0.25rem; background-color: var(--border); color: var(--text-main); padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8125rem; text-decoration: none; font-weight: 500; transition: background-color 0.2s; }
    .btn-audio:hover { background-color: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🛡️ TATA AIG Health Voice Control Centre</h1>
        <p style="color: var(--text-muted); margin-top: 0.25rem;">Asha Real-time Call Analytics and Operations</p>
      </div>
      <div class="status-badge"><span class="pulse-dot"></span>Asha Agent Active</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Calls</div><div class="stat-value">${stats.totalCalls}</div><div class="stat-desc">All-time calls processed</div></div>
      <div class="stat-card"><div class="stat-label">Avg Duration</div><div class="stat-value">${stats.avgDuration}s</div><div class="stat-desc">Seconds per completed call</div></div>
      <div class="stat-card"><div class="stat-label">Hot Leads</div><div class="stat-value" style="color: var(--error);">${stats.hotLeads}</div><div class="stat-desc">Lead Score >= 70</div></div>
      <div class="stat-card"><div class="stat-label">Warm Leads</div><div class="stat-value" style="color: var(--warning);">${stats.warmLeads}</div><div class="stat-desc">Lead Score 40-69</div></div>
      <div class="stat-card"><div class="stat-label">Quotes Sent</div><div class="stat-value">${stats.quotesSent}</div><div class="stat-desc">Sent via WhatsApp</div></div>
      <div class="stat-card"><div class="stat-label">Appointments</div><div class="stat-value" style="color: var(--success);">${stats.appointments}</div><div class="stat-desc">Advisor meetings scheduled</div></div>
      <div class="stat-card"><div class="stat-label">Transfers</div><div class="stat-value">${stats.transfers}</div><div class="stat-desc">Transferred to human advisors</div></div>
    </div>

    <div class="card">
      <h2 class="card-title">Recent Call Activity</h2>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Phone</th><th>Direction</th><th>Status</th><th>Duration</th><th>Current Stage</th><th>Time Initiated</th><th>Recording</th></tr>
          </thead>
          <tbody>
            ${
              calls.length === 0
                ? `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No active call logs found. Start a test call!</td></tr>`
                : calls
                    .map((c) => {
                      const phoneMasked = c.phone ? c.phone.slice(0, 6) + "*****" : "Unknown";
                      let sessionObj = {};
                      try {
                        sessionObj = JSON.parse(c.session_data || "{}");
                      } catch (e) {}
                      const directionClass = sessionObj.direction === "inbound" ? "badge-inbound" : "badge-outbound";
                      const statusClass = c.status === "completed" ? "badge-completed" : c.status === "in_progress" ? "badge-progress" : "badge-failed";

                      let recordingLink = "N/A";
                      if (sessionObj.recordingUrl) {
                        recordingLink = `<a class="btn-audio" href="${sessionObj.recordingUrl}" target="_blank">▶ Play</a>`;
                      } else if (c.status === "completed" && c.call_duration > 0) {
                        recordingLink = `<span style="color: var(--text-muted)">Processing...</span>`;
                      }

                      return `
                <tr>
                  <td><strong>${phoneMasked}</strong></td>
                  <td><span class="badge ${directionClass}">${sessionObj.direction || "outbound"}</span></td>
                  <td><span class="badge ${statusClass}">${c.status}</span></td>
                  <td>${c.call_duration ? c.call_duration + "s" : "0s"}</td>
                  <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;">${c.stage}</code></td>
                  <td>${new Date(c.started_at + "Z").toLocaleString("en-IN")}</td>
                  <td>${recordingLink}</td>
                </tr>`;
                    })
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// =============================================================================
// SECTION 15 — WORKER ENTRYPOINT
// =============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const reqOrigin = request.headers.get("Origin") || "*";

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(reqOrigin) });
    }

    try {
      if (url.pathname === "/") return await handleDashboard(request, env);
      if (url.pathname === "/health") {
        return jsonResponse({ status: "ok", agent: env.AGENT_NAME || CONFIG.AGENT_NAME, model: env.GEMINI_MODEL || CONFIG.GEMINI_MODEL }, 200, reqOrigin);
      }
      if (url.pathname === "/test-call" && method === "POST") return await handleTestCall(request, env);

      if (url.pathname === "/voice/incoming" && method === "POST") return await routeCallIncoming(request, env, ctx);
      if (url.pathname === "/voice/gather" && method === "POST") return await routeCallGather(request, env, ctx);
      if (url.pathname === "/voice/status" && method === "POST") return await handleCallStatus(request, env, ctx);
      if (url.pathname === "/voice/fallback" && method === "POST") return await handleCallFallback(request, env, ctx);

      if (url.pathname === "/whatsapp/webhook") return new Response("OK", { status: 200 });

      if (url.pathname === "/voice/browser-session" && method === "POST") return await handleBrowserSession(request, env);
      if (url.pathname === "/voice/browser-turn" && method === "POST") return await handleBrowserTurn(request, env);

      if (url.pathname.startsWith("/api/db/") && method === "GET") return await handleApiDb(request, env);
      if (url.pathname === "/api/health" && method === "GET") return await handleEnhancedHealth(request, env);
      if (url.pathname === "/api/status" && method === "GET") return await handleApiStatus(request, env);
      if (url.pathname === "/api/config" && method === "GET") return handleApiConfig(request, env);
      if (url.pathname === "/api/session/end" && method === "POST") return await handleApiSessionEnd(request, env);
      if (url.pathname.startsWith("/api/session/") && method === "GET") return await handleApiSessionGet(request, env);
      if (url.pathname.startsWith("/api/customer/") && method === "GET") return await handleApiCustomerGet(request, env);
      if (url.pathname.startsWith("/api/history/") && method === "GET") return await handleApiHistory(request, env);
      if (url.pathname === "/api/analytics" && method === "GET") return await handleApiAnalytics(request, env);
      if (url.pathname === "/api/feedback" && method === "POST") return await handleApiFeedback(request, env);
      if (url.pathname === "/api/debug/routes" && method === "GET") return handleDebugRoutes(request, env);
      if (url.pathname === "/api/debug/env" && method === "GET") return handleDebugEnv(request, env);

      return jsonResponse({ error: "Not Found", path: url.pathname }, 404, reqOrigin);
    } catch (err) {
      log.error("Global router error", { error: err.message, stack: err.stack });
      return new Response("Internal Server Error", { status: 500 });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processDueCallbacks(env));
  },
};
