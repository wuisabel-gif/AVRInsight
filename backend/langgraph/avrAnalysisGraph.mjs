import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import * as z from "zod";
import { avrRegisters } from "../../src/data/avrRegisters.js";
import { unoPins } from "../../src/data/unoPins.js";
import { explainWithOpenAI } from "../openai/explainWithOpenAI.mjs";

const AnalysisState = new StateSchema({
  userQuery: z.string().default(""),
  codeSnippet: z.string().default(""),
  useLlm: z.boolean().default(false),
  parsedCode: z
    .object({
      lines: z.array(z.string()).default([]),
      registers: z
        .array(
          z.object({
            name: z.string(),
            bits: z.array(z.string()).default([]),
            rawLine: z.string(),
          }),
        )
        .default([]),
      isrVectors: z.array(z.string()).default([]),
      pinMentions: z.array(z.string()).default([]),
      apiCalls: z.array(z.string()).default([]),
      modeMentions: z.array(z.string()).default([]),
    })
    .default({
      lines: [],
      registers: [],
      isrVectors: [],
      pinMentions: [],
      apiCalls: [],
      modeMentions: [],
    }),
  resolvedPins: z
    .array(
      z.object({
        query: z.string(),
        pinId: z.string(),
        aliases: z.array(z.string()).default([]),
        capabilities: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  detectedMode: z
    .object({
      type: z.enum(["external", "pin-change", "timer", "polling", "mixed", "unknown"]),
      confidence: z.number(),
      reason: z.string(),
    })
    .default({
      type: "unknown",
      confidence: 0,
      reason: "No interrupt or timer pattern detected yet.",
    }),
  externalInterruptAnalysis: z
    .object({
      triggers: z.array(z.string()).default([]),
      vectors: z.array(z.string()).default([]),
      enabledInterrupts: z.array(z.string()).default([]),
      notes: z.array(z.string()).default([]),
    })
    .default({ triggers: [], vectors: [], enabledInterrupts: [], notes: [] }),
  pinChangeAnalysis: z
    .object({
      groups: z.array(z.string()).default([]),
      maskedPins: z.array(z.string()).default([]),
      vectors: z.array(z.string()).default([]),
      notes: z.array(z.string()).default([]),
    })
    .default({ groups: [], maskedPins: [], vectors: [], notes: [] }),
  timerAnalysis: z
    .object({
      timers: z.array(z.string()).default([]),
      compareRegisters: z.array(z.string()).default([]),
      vectors: z.array(z.string()).default([]),
      notes: z.array(z.string()).default([]),
    })
    .default({ timers: [], compareRegisters: [], vectors: [], notes: [] }),
  capabilityChecks: z
    .array(
      z.object({
        target: z.string(),
        ok: z.boolean(),
        reason: z.string(),
      }),
    )
    .default([]),
  likelyIssues: z
    .array(
      z.object({
        severity: z.enum(["low", "medium", "high"]),
        issue: z.string(),
        evidence: z.string(),
        fix: z.string().optional(),
      }),
    )
    .default([]),
  finalExplanation: z.string().default(""),
  llmReasoning: z
    .object({
      enabled: z.boolean(),
      status: z.enum(["disabled", "skipped", "completed", "error"]),
      model: z.string().default(""),
      explanation: z.string().default(""),
      error: z.string().default(""),
    })
    .default({
      enabled: false,
      status: "disabled",
      model: "",
      explanation: "",
      error: "",
    }),
});

const aliasToPin = new Map();
for (const pin of unoPins) {
  for (const alias of [pin.id, ...(pin.aliases || [])]) {
    aliasToPin.set(alias.toLowerCase(), pin);
  }
}

function unique(values) {
  return [...new Set(values)];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPinsInText(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const pin of unoPins) {
    for (const alias of [pin.id, ...(pin.aliases || [])]) {
      const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(alias.toLowerCase())}([^a-z0-9_]|$)`);
      if (pattern.test(lower)) {
        found.push(alias);
      }
    }
  }
  return unique(found);
}

function inferExternalMode(bits) {
  const has00 = bits.includes("ISC00");
  const has01 = bits.includes("ISC01");
  const has10 = bits.includes("ISC10");
  const has11 = bits.includes("ISC11");

  const int0 =
    has00 && has01
      ? "INT0 rising edge"
      : !has00 && has01
        ? "INT0 falling edge"
        : has00
          ? "INT0 any logical change"
          : "INT0 low level or incomplete configuration";

  const int1 =
    has10 && has11
      ? "INT1 rising edge"
      : !has10 && has11
        ? "INT1 falling edge"
        : has10
          ? "INT1 any logical change"
          : "INT1 low level or incomplete configuration";

  return [int0, int1];
}

function parseInputNode(state) {
  const source = `${state.userQuery || ""}\n${state.codeSnippet || ""}`.trim();
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const registers = lines
    .map((line) => {
      const match = line.match(/^([A-Z0-9]+)\s*([|&+\-^]?=|=)\s*(.+?);?$/);
      if (!match) {
        return null;
      }

      return {
        name: match[1],
        bits: [...line.matchAll(/\(\s*1\s*<<\s*([A-Z0-9_]+)\s*\)/g)].map((item) => item[1]),
        rawLine: line,
      };
    })
    .filter(Boolean);

  const isrVectors = [...source.matchAll(/ISR\s*\(\s*([A-Za-z0-9_]+)\s*\)/g)].map((item) => item[1]);
  const pinMentions = findPinsInText(source);
  const apiCalls = unique(
    [...source.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)]
      .map((item) => item[1])
      .filter((name) =>
        ["attachInterrupt", "digitalPinToInterrupt", "digitalRead", "analogWrite", "pinMode"].includes(name),
      ),
  );
  const modeMentions = unique([...source.matchAll(/\b(LOW|CHANGE|FALLING|RISING)\b/g)].map((item) => item[1]));

  return {
    parsedCode: {
      lines,
      registers,
      isrVectors,
      pinMentions,
      apiCalls,
      modeMentions,
    },
  };
}

function resolvePinsNode(state) {
  const resolvedPins = state.parsedCode.pinMentions
    .map((token) => {
      const pin = aliasToPin.get(token.toLowerCase());
      if (!pin) {
        return null;
      }

      return {
        query: token,
        pinId: pin.id,
        aliases: pin.aliases || [],
        capabilities: [
          ...(pin.functions || []),
          ...(pin.communication || []),
          ...(pin.timers || []).map((timer) => `${timer.name}${timer.channel ? ` ${timer.channel}` : ""}`),
        ],
      };
    })
    .filter(Boolean);

  return { resolvedPins };
}

function detectModeNode(state) {
  const registerNames = state.parsedCode.registers.map((item) => item.name);
  const combined = `${state.userQuery}\n${state.codeSnippet}`;
  const hasExternal =
    registerNames.some((name) => ["EICRA", "EIMSK", "EIFR"].includes(name)) ||
    combined.includes("INT0") ||
    combined.includes("INT1") ||
    state.parsedCode.apiCalls.includes("attachInterrupt");
  const hasPinChange =
    registerNames.some((name) => ["PCICR", "PCIFR", "PCMSK0", "PCMSK1", "PCMSK2"].includes(name)) ||
    combined.includes("PCINT");
  const hasTimer =
    registerNames.some((name) => /^TCCR|^TIMSK|^OCR|^TCNT|^TIFR/.test(name)) ||
    state.parsedCode.isrVectors.some((vector) => vector.startsWith("TIMER"));
  const hasPolling = state.parsedCode.apiCalls.includes("digitalRead") || /\bloop\s*\(/.test(combined);

  const modes = [
    hasExternal ? "external" : null,
    hasPinChange ? "pin-change" : null,
    hasTimer ? "timer" : null,
    hasPolling ? "polling" : null,
  ].filter(Boolean);

  let type = "unknown";
  if (modes.length === 1) {
    [type] = modes;
  } else if (modes.length > 1) {
    type = "mixed";
  }

  return {
    detectedMode: {
      type,
      confidence: modes.length ? Math.min(1, 0.35 + modes.length * 0.2) : 0.1,
      reason: modes.length
        ? `Detected signals for ${modes.join(", ")} reasoning based on registers, vectors, and API calls.`
        : "No strong interrupt or timer pattern matched the snippet.",
    },
  };
}

function analyzeExternalInterruptsNode(state) {
  const eicra = state.parsedCode.registers.find((item) => item.name === "EICRA");
  const eimsk = state.parsedCode.registers.find((item) => item.name === "EIMSK");
  const triggers = [];
  const enabledInterrupts = [];
  const notes = [];

  if (eicra) {
    triggers.push(...inferExternalMode(eicra.bits));
    notes.push(`EICRA bits: ${eicra.bits.join(", ") || "none"}`);
  }

  if (eimsk) {
    if (eimsk.bits.includes("INT0")) {
      enabledInterrupts.push("INT0");
    }
    if (eimsk.bits.includes("INT1")) {
      enabledInterrupts.push("INT1");
    }
    notes.push(`EIMSK enables: ${enabledInterrupts.join(", ") || "no INT0/INT1 bits found"}`);
  }

  return {
    externalInterruptAnalysis: {
      triggers,
      vectors: state.parsedCode.isrVectors.filter((vector) => /^INT[01]_vect$/.test(vector)),
      enabledInterrupts,
      notes,
    },
  };
}

function analyzePinChangeInterruptsNode(state) {
  const groups = [];
  const maskedPins = [];
  const notes = [];

  for (const register of state.parsedCode.registers) {
    if (register.name === "PCICR") {
      if (register.bits.includes("PCIE0")) groups.push("PCINT[7:0] / PORTB");
      if (register.bits.includes("PCIE1")) groups.push("PCINT[14:8] / PORTC");
      if (register.bits.includes("PCIE2")) groups.push("PCINT[23:16] / PORTD");
    }

    if (/^PCMSK[012]$/.test(register.name)) {
      maskedPins.push(...register.bits.filter((bit) => bit.startsWith("PCINT")));
    }
  }

  if (groups.length) {
    notes.push(`PCICR groups enabled: ${groups.join(", ")}`);
  }
  if (maskedPins.length) {
    notes.push(`Pin-change mask bits: ${maskedPins.join(", ")}`);
  }

  return {
    pinChangeAnalysis: {
      groups,
      maskedPins,
      vectors: state.parsedCode.isrVectors.filter((vector) => /^PCINT[0-2]_vect$/.test(vector)),
      notes,
    },
  };
}

function analyzeTimerInterruptsNode(state) {
  const timers = unique(
    state.parsedCode.registers
      .map((item) => item.name.match(/(TCCR|TIMSK|TIFR|TCNT|OCR)([0-2])/))
      .filter(Boolean)
      .map((match) => `Timer${match[2]}`),
  );
  const compareRegisters = unique(
    state.parsedCode.registers.map((item) => item.name).filter((name) => /^OCR[0-2][AB]?$/.test(name)),
  );
  const notes = [];

  if (timers.length) {
    notes.push(`Timer blocks touched: ${timers.join(", ")}`);
  }
  if (compareRegisters.length) {
    notes.push(`Compare registers touched: ${compareRegisters.join(", ")}`);
  }

  return {
    timerAnalysis: {
      timers,
      compareRegisters,
      vectors: state.parsedCode.isrVectors.filter((vector) => vector.startsWith("TIMER")),
      notes,
    },
  };
}

function routeAfterDetectMode(state) {
  switch (state.detectedMode.type) {
    case "external":
      return "analyze_external_interrupts";
    case "pin-change":
      return "analyze_pin_change_interrupts";
    case "timer":
      return "analyze_timer_interrupts";
    case "mixed":
      return "analyze_external_interrupts";
    default:
      return "check_capabilities";
  }
}

function routeAfterExternal(state) {
  if (state.detectedMode.type === "mixed" && state.pinChangeAnalysis.groups.length === 0) {
    return "analyze_pin_change_interrupts";
  }
  if (state.detectedMode.type === "mixed" && state.timerAnalysis.timers.length === 0) {
    return "analyze_timer_interrupts";
  }
  return "check_capabilities";
}

function routeAfterPinChange(state) {
  if (state.detectedMode.type === "mixed" && state.timerAnalysis.timers.length === 0) {
    return "analyze_timer_interrupts";
  }
  return "check_capabilities";
}

function checkCapabilitiesNode(state) {
  const capabilityChecks = [];

  for (const resolved of state.resolvedPins) {
    const pin = unoPins.find((entry) => entry.id === resolved.pinId);
    if (!pin) {
      continue;
    }

    if (state.detectedMode.type === "external" || state.detectedMode.type === "mixed") {
      capabilityChecks.push({
        target: resolved.pinId,
        ok: Boolean(pin.externalInterrupt),
        reason: pin.externalInterrupt
          ? `${resolved.pinId} supports ${pin.externalInterrupt.name}.`
          : `${resolved.pinId} does not expose a dedicated INT0/INT1 interrupt capability.`,
      });
    }

    if (state.detectedMode.type === "pin-change" || state.detectedMode.type === "mixed") {
      capabilityChecks.push({
        target: resolved.pinId,
        ok: Boolean(pin.pinChangeInterrupt),
        reason: pin.pinChangeInterrupt
          ? `${resolved.pinId} supports ${pin.pinChangeInterrupt.name}.`
          : `${resolved.pinId} is missing pin-change metadata in the current dataset.`,
      });
    }

    if (state.detectedMode.type === "timer" || state.detectedMode.type === "mixed") {
      capabilityChecks.push({
        target: resolved.pinId,
        ok: Boolean(pin.timers?.length),
        reason: pin.timers?.length
          ? `${resolved.pinId} maps to ${pin.timers.map((timer) => `${timer.name} ${timer.channel || ""}`.trim()).join(", ")}.`
          : `${resolved.pinId} is not mapped to a timer compare/capture role in the current dataset.`,
      });
    }
  }

  return { capabilityChecks };
}

function diagnoseNode(state) {
  const likelyIssues = [];
  const vectorSet = new Set(state.parsedCode.isrVectors);
  const enabledExternal = new Set(state.externalInterruptAnalysis.enabledInterrupts);

  if (enabledExternal.has("INT0") && !vectorSet.has("INT0_vect")) {
    likelyIssues.push({
      severity: "high",
      issue: "INT0 appears enabled, but the matching ISR vector is missing.",
      evidence: "EIMSK enables INT0, but no ISR(INT0_vect) was found.",
      fix: "Add ISR(INT0_vect) or ensure your Arduino attachInterrupt callback path is the one actually used.",
    });
  }

  if (enabledExternal.has("INT1") && !vectorSet.has("INT1_vect")) {
    likelyIssues.push({
      severity: "high",
      issue: "INT1 appears enabled, but the matching ISR vector is missing.",
      evidence: "EIMSK enables INT1, but no ISR(INT1_vect) was found.",
      fix: "Add ISR(INT1_vect) or verify your callback/vector mapping.",
    });
  }

  if (state.pinChangeAnalysis.groups.length > 0 && state.pinChangeAnalysis.maskedPins.length === 0) {
    likelyIssues.push({
      severity: "high",
      issue: "Pin-change interrupt group enabled without any PCMSK bit.",
      evidence: "PCICR enables a group, but no PCINT bit was found in PCMSK0/1/2.",
      fix: "Set the specific PCINT mask bit for the pin you want to watch.",
    });
  }

  if (state.detectedMode.type === "timer" && state.timerAnalysis.vectors.length === 0) {
    likelyIssues.push({
      severity: "medium",
      issue: "Timer configuration exists without an obvious timer ISR.",
      evidence: "Timer control or mask registers were parsed, but no TIMER*_vect ISR was detected.",
      fix: "Check whether you intended to use PWM only, polling, or an actual timer interrupt service routine.",
    });
  }

  for (const check of state.capabilityChecks) {
    if (!check.ok) {
      likelyIssues.push({
        severity: "medium",
        issue: `Capability mismatch for ${check.target}.`,
        evidence: check.reason,
        fix: "Choose a pin whose interrupt or timer capability matches the configuration.",
      });
    }
  }

  if (likelyIssues.length === 0) {
    likelyIssues.push({
      severity: "low",
      issue: "No obvious deterministic mismatch found.",
      evidence: "The parsed pins, vectors, and register clues appear internally consistent.",
      fix: "Next, inspect wiring, pull-up configuration, ISR contents, and runtime assumptions.",
    });
  }

  return { likelyIssues };
}

function explainNode(state) {
  const pinSummary = state.resolvedPins.length
    ? `Resolved pins: ${unique(state.resolvedPins.map((item) => `${item.query} -> ${item.pinId}`)).join(", ")}.`
    : "No explicit pin alias was resolved.";
  const modeSummary = `Detected mode: ${state.detectedMode.type} (${Math.round(state.detectedMode.confidence * 100)}% confidence). ${state.detectedMode.reason}`;
  const issueSummary = state.likelyIssues
    .slice(0, 3)
    .map((item) => `${item.severity.toUpperCase()}: ${item.issue} ${item.evidence}`)
    .join(" ");

  return {
    finalExplanation: `${pinSummary} ${modeSummary} ${issueSummary}`.trim(),
  };
}

function routeAfterExplain(state) {
  return state.useLlm ? "llm_reasoning" : END;
}

async function llmReasoningNode(state) {
  if (!state.useLlm) {
    return {
      llmReasoning: {
        enabled: false,
        status: "disabled",
        model: "",
        explanation: "",
        error: "",
      },
    };
  }

  try {
    const result = await explainWithOpenAI({
      userQuery: state.userQuery,
      codeSnippet: state.codeSnippet,
      detectedMode: state.detectedMode,
      resolvedPins: state.resolvedPins,
      externalInterruptAnalysis: state.externalInterruptAnalysis,
      pinChangeAnalysis: state.pinChangeAnalysis,
      timerAnalysis: state.timerAnalysis,
      capabilityChecks: state.capabilityChecks,
      likelyIssues: state.likelyIssues,
      deterministicExplanation: state.finalExplanation,
    });

    return {
      llmReasoning: {
        enabled: result.enabled,
        status: result.status,
        model: result.model,
        explanation: result.explanation,
        error: result.error || "",
      },
    };
  } catch (error) {
    return {
      llmReasoning: {
        enabled: true,
        status: "error",
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        explanation: "",
        error: error instanceof Error ? error.message : "Unknown OpenAI reasoning error",
      },
    };
  }
}

export const avrAnalysisGraph = new StateGraph(AnalysisState)
  .addNode("parse_input", parseInputNode)
  .addNode("resolve_pins", resolvePinsNode)
  .addNode("detect_mode", detectModeNode)
  .addNode("analyze_external_interrupts", analyzeExternalInterruptsNode)
  .addNode("analyze_pin_change_interrupts", analyzePinChangeInterruptsNode)
  .addNode("analyze_timer_interrupts", analyzeTimerInterruptsNode)
  .addNode("check_capabilities", checkCapabilitiesNode)
  .addNode("diagnose", diagnoseNode)
  .addNode("explain", explainNode)
  .addNode("llm_reasoning", llmReasoningNode)
  .addEdge(START, "parse_input")
  .addEdge("parse_input", "resolve_pins")
  .addEdge("resolve_pins", "detect_mode")
  .addConditionalEdges("detect_mode", routeAfterDetectMode)
  .addConditionalEdges("analyze_external_interrupts", routeAfterExternal)
  .addConditionalEdges("analyze_pin_change_interrupts", routeAfterPinChange)
  .addEdge("analyze_timer_interrupts", "check_capabilities")
  .addEdge("check_capabilities", "diagnose")
  .addEdge("diagnose", "explain")
  .addConditionalEdges("explain", routeAfterExplain)
  .addEdge("llm_reasoning", END)
  .compile();

export async function analyzeAvrSnippet(input) {
  return avrAnalysisGraph.invoke({
    userQuery: input.userQuery || "",
    codeSnippet: input.codeSnippet || "",
    useLlm: Boolean(input.useLlm),
  });
}

export function explainRegister(registerName) {
  return avrRegisters[registerName] || null;
}
