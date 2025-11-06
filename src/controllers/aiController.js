const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const SYSTEM_PROMPT = `You are a helpful assistant for a family health tracking app called Trackii.
Only answer questions about using the app (profiles, logs, weight, water, prescriptions, reminders).
Do NOT provide medical advice. If user asks medical/diagnosis/treatment questions, politely decline and advise to consult a professional.
Be concise.`;

function isMedical(q) {
  const s = String(q || "").toLowerCase();
  const medicalHints = [
    "diagnos", "symptom", "treat", "dose", "dosage", "side effect", "interact",
    "is it safe", "should i take", "what should i take", "pain", "fever",
    "prescribe", "contraindication", "pregnancy safe"
  ];
  return medicalHints.some(h => s.includes(h));
}

function localAnswer(q) {
  const s = String(q || "").toLowerCase();

  if (!s.trim()) return "Please type a question about using Trackii.";
  if (isMedical(s)) {
    return "I can’t provide medical advice. Please consult a qualified healthcare professional.";
  }

  if (s.includes("log weight") || s.includes("add weight") || s.includes("weight log")) {
    return "To log weight: open a profile → Logs → + Quick Log → category: weight → enter value → Save.";
  }
  if (s.includes("view weight") || s.includes("weight chart") || s.includes("trend")) {
    return "Open a profile → Chart tab to see recent weight. The dashboard may also show a quick chart if available.";
  }
  if (s.includes("reminder") || s.includes("notification")) {
    return "Medication reminders are generated from active prescriptions. Dismiss a card to hide it until its next slot/day.";
  }
  if (s.includes("prescription") || s.includes("rx")) {
    return "Go to a profile → Prescriptions → + Add Rx. Set frequency (e.g., daily, 2x/day, every 8h) and mark active.";
  }
  if (s.includes("profile")) {
    return "Profiles: Dashboard → + Add Profile. You can set type (general, pregnancy, child) and toggle active/inactive.";
  }
  if (s.includes("water") || s.includes("hydrate")) {
    return "To track water: open profile → Logs → + Quick Log → category: water → enter cups/oz and Save.";
  }
  if (s.includes("meal") || s.includes("food")) {
    return "To log meals: open profile → Logs → + Quick Log → category: meal → add notes if useful and Save.";
  }
  if (s.includes("delete profile") || s.includes("remove profile")) {
    return "Open the profile card menu and choose Delete. This cannot be undone.";
  }
  if (s.includes("faq") || s.includes("help") || s.includes("how")) {
    return "Ask about: profiles, weight logs, water logs, prescriptions, reminders, insights. I can’t give medical advice.";
  }

  return "I can help with Trackii features like profiles, logs, prescriptions, and reminders. What would you like to do?";
}

async function askLLM(q) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: String(q).slice(0, 2000) },
    ],
    max_tokens: 300,
    temperature: 0.3,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    return null;
  }
  const j = await r.json();
  const answer = j?.choices?.[0]?.message?.content?.trim();
  return answer || null;
}

exports.ask = async (req, res) => {
  try {
    const q = String(req.body?.q || "").slice(0, 2000);

    if (isMedical(q)) {
      return res.json({ data: { answer: "I can’t provide medical advice. Please consult a qualified healthcare professional." } });
    }

    const llm = await askLLM(q);
    if (llm) {
      return res.json({ data: { answer: llm } });
    }

    const local = localAnswer(q);
    return res.json({ data: { answer: local } });
  } catch (e) {
    console.error("AI ask error:", e);
    return res.status(500).json({ message: "AI service error" });
  }
};
