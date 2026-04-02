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
  } catch (e) { /* continue */ }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) { /* continue */ }
  }

  // Strategy 3: Find the first { and last } and try parsing that
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch (e) { /* continue */ }
  }

  return null;
}

/**
 * Call Claude API with structured JSON output.
 * Optionally enables extended thinking.
 * Returns { result, usage, thinking, rawText }
 */
async function callAgent({ model, systemPrompt, messages, maxTokens, agentName, thinkingBudget }) {
  console.log(`\n[${'='.repeat(50)}]`);
  console.log(`[${agentName || 'agent'}] Calling ${model} (max_tokens: ${maxTokens}${thinkingBudget ? `, thinking: ${thinkingBudget}` : ''})...`);

  const requestParams = {
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
  };

  // Enable extended thinking if budget specified
  if (thinkingBudget) {
    requestParams.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
  }

  const response = await client.messages.create(requestParams);

  // Collect text and thinking blocks separately
  let text = '';
  const thinkingBlocks = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'thinking') {
      thinkingBlocks.push(block.thinking);
    }
  }

  const usage = {
    input: response.usage?.input_tokens || 0,
    output: response.usage?.output_tokens || 0,
  };

  console.log(`[${agentName || 'agent'}] Tokens: ${usage.input} in / ${usage.output} out${thinkingBlocks.length ? ` | thinking blocks: ${thinkingBlocks.length}` : ''}`);
  console.log(`[${agentName || 'agent'}] Raw response (first 300 chars): ${text.substring(0, 300)}...`);

  const result = extractJSON(text);

  if (result) {
    console.log(`[${agentName || 'agent'}] JSON parsed successfully.`);
  } else {
    console.log(`[${agentName || 'agent'}] WARNING: JSON parse failed! Full response:\n${text.substring(0, 800)}`);
  }

  return {
    result: result || { _raw: text, _parseError: 'Failed to extract JSON from response' },
    usage,
    thinking: thinkingBlocks.join('\n\n---\n\n'),
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

  let turnEntry = state.tokenUsage.byTurn.find((t) => t.turnNumber === turnNumber);
  if (!turnEntry) {
    turnEntry = { turnNumber, totalInput: 0, totalOutput: 0, timestamp: new Date().toISOString() };
    state.tokenUsage.byTurn.push(turnEntry);
  }
  turnEntry[agentName] = { input: usage.input, output: usage.output };
  turnEntry.totalInput += usage.input;
  turnEntry.totalOutput += usage.output;
}

module.exports = { callAgent, trackUsage, extractJSON };
