import OpenAI from "openai";

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

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

export async function explainWithOpenAI(payload) {
  const defaultModel = process.env.OPENAI_MODEL || "gpt-5.5";
  const defaultReasoningEffort = process.env.OPENAI_REASONING_EFFORT || "medium";
  const client = createClient();
  if (!client) {
    return {
      enabled: false,
      status: "skipped",
      model: "",
      explanation: "",
      error: "OPENAI_API_KEY is not set, so the optional LLM reasoning step was skipped.",
    };
  }

  const response = await client.responses.create({
    model: defaultModel,
    reasoning: {
      effort: defaultReasoningEffort,
    },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You explain AVR/Arduino interrupt and timer bugs carefully and accurately.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPrompt(payload),
          },
        ],
      },
    ],
  });

  return {
    enabled: true,
    status: "completed",
    model: defaultModel,
    explanation: response.output_text || "",
    error: "",
  };
}
