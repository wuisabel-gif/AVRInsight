import { loadLocalEnv } from "./loadEnv.mjs";
import { analyzeAvrSnippet } from "./langgraph/avrAnalysisGraph.mjs";

loadLocalEnv();

const result = await analyzeAvrSnippet({
  userQuery: "Why is my INT0 interrupt not firing on D2?",
  codeSnippet: `
EICRA |= (1 << ISC01) | (1 << ISC00);
EIMSK |= (1 << INT0);
ISR(INT1_vect) {
}
  `,
  useLlm: true,
});

console.log(JSON.stringify(result, null, 2));
