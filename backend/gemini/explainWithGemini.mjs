function buildPrompt(payload) {
  return [
    "You are an AVR and Arduino debugging assistant.",
    "Use the structured analysis as ground truth and produce a concise but helpful explanation for a beginner.",
    "Do not invent registers, vectors, or pin capabilities not present in the input.",
    "If the deterministic analysis found likely issues, prioritize those.",
    "Return plain text with short sections: Summary, Why, Next checks.",
    "",
    "User query:",
    payload.userQuery || "(none)",
    "",
    "Code snippet:",
    payload.codeSnippet || "(none)",
    "",
    "Deterministic mode detection:",
    JSON.stringify(payload.detectedMode, null, 2),
    "",
    "Resolved pins:",
    JSON.stringify(payload.resolvedPins, null, 2),
    "",
    "External interrupt analysis:",
    JSON.stringify(payload.externalInterruptAnalysis, null, 2),
    "",
    "Pin-change analysis:",
    JSON.stringify(payload.pinChangeAnalysis, null, 2),
    "",
    "Timer analysis:",
    JSON.stringify(payload.timerAnalysis, null, 2),
    "",
    "Capability checks:",
    JSON.stringify(payload.capabilityChecks, null, 2),
    "",
    "Likely issues:",
    JSON.stringify(payload.likelyIssues, null, 2),
    "",
    "Deterministic explanation:",
    payload.deterministicExplanation || "(none)",
  ].join("\n");
}

function extractText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function explainWithGemini(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return {
      enabled: false,
      status: "skipped",
      model: "",
      explanation: "",
      error: "GEMINI_API_KEY is not set, so the optional LLM reasoning step was skipped.",
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(defaultModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "You explain AVR/Arduino interrupt and timer bugs carefully and accurately.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt(payload),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}.`);
  }

  return {
    enabled: true,
    status: "completed",
    model: defaultModel,
    explanation: extractText(data),
    error: "",
  };
}
