const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

/**
 * Extract JSON from text that may contain markdown code blocks,
 * explanatory text before/after, etc.
 */
function extractJSON(text) {
  // Strategy 1: Try parsing the whole text as JSON directly
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // continue
  }

  // Strategy 2: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // continue
    }
  }

  // Strategy 3: Find the first { and last } and try parsing that
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch (e) {
      // continue
    }
  }

  return null;
}

/**
 * Call Claude API with structured JSON output.
 * Returns { result, usage, rawText } where usage tracks input/output tokens.
 */
async function callAgent({ model, systemPrompt, messages, maxTokens, agentName }) {
  console.log(`\n[${'='.repeat(50)}]`);
  console.log(`[${agentName || 'agent'}] Calling ${model} (max_tokens: ${maxTokens})...`);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const usage = {
    input: response.usage?.input_tokens || 0,
    output: response.usage?.output_tokens || 0,
  };

  console.log(`[${agentName || 'agent'}] Response received. Tokens: ${usage.input} in / ${usage.output} out`);
  console.log(`[${agentName || 'agent'}] Raw response (first 300 chars): ${text.substring(0, 300)}...`);

  // Try to parse as JSON
  const result = extractJSON(text);

  if (result) {
    console.log(`[${agentName || 'agent'}] JSON parsed successfully.`);
  } else {
    console.log(`[${agentName || 'agent'}] WARNING: JSON parse failed! Full response:`);
    console.log(text.substring(0, 1000));
  }

  return {
    result: result || { _raw: text, _parseError: 'Failed to extract JSON from response' },
    usage,
    rawText: text,
  };
}

/**
 * Track token usage into the story state.
 */
function trackUsage(state, agentName, usage, turnNumber) {
  const agent = state.tokenUsage.byAgent[agentName];
  if (agent) {
    agent.input += usage.input;
    agent.output += usage.output;
    agent.calls += 1;
  }
  state.tokenUsage.total.input += usage.input;
  state.tokenUsage.total.output += usage.output;

  // Add to per-turn tracking
  let turnEntry = state.tokenUsage.byTurn.find((t) => t.turnNumber === turnNumber);
  if (!turnEntry) {
    turnEntry = { turnNumber, totalInput: 0, totalOutput: 0, timestamp: new Date().toISOString() };
    state.tokenUsage.byTurn.push(turnEntry);
  }
  turnEntry[agentName] = { input: usage.input, output: usage.output };
  turnEntry.totalInput += usage.input;
  turnEntry.totalOutput += usage.output;
}

module.exports = { callAgent, trackUsage };
