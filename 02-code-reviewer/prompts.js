export function buildAnalysisPrompt(code, filename = "") {
    const fileHint = filename ? `File: ${filename}\n\n` : "";

    return `${fileHint}You are a senior software engineer doing a thorough code review.

Analyze this code carefully. Identify ALL of the following:
- Bugs: logic errors, off-by-one, null/undefined risks, unhandled edge cases
- Security: injection risks, hardcoded secrets, missing auth checks, unsafe input handling  
- Performance: unnecessary loops, missing indexes, blocking operations, memory leaks
- Maintainability: unclear naming, functions doing too many things, missing error handling
- Style: inconsistency, dead code, overly complex expressions

For each issue you find:
1. State exactly what line or area has the problem
2. Explain why it's a problem and what could go wrong
3. Give a concrete fix — actual code if possible, not just "refactor this"

Also note what the code does well — at least one positive observation.

Finally give an overall quality score 0-100 where:
  90-100 = production ready
  70-89  = good, minor issues
  50-69  = works but needs improvement
  30-49  = significant problems
  0-29   = major issues, needs rewrite

Code to review:
\`\`\`
${code}
\`\`\``;
}

export function buildFormattingPrompt(analysis, schema) {
    return `Convert this code review analysis into valid JSON matching the schema below.

RULES:
- Output ONLY valid JSON. No markdown fences. Start with { and end with }.
- One object per issue in the issues array — do not merge issues
- severity must be exactly one of: critical | high | medium | low | info
- type must be exactly one of: bug | security | performance | style | maintainability
- fix must contain a concrete suggestion, not just "fix this"
- id format: ISS-001, ISS-002, etc.
- If line number is not identifiable, use null

SCHEMA:
{
  "score": <number 0-100>,
  "language": "<detected language>",
  "summary": "<2-3 sentence overall assessment>",
  "issues": [
    {
      "id": "ISS-001",
      "type": "bug|security|performance|style|maintainability",
      "severity": "critical|high|medium|low|info",
      "line": <number or null>,
      "title": "<specific title: what is wrong>",
      "detail": "<why it's a problem>",
      "fix": "<concrete fix suggestion>"
    }
  ],
  "positives": ["<thing done well>"]
}

ANALYSIS TO CONVERT:
${analysis}`;
}