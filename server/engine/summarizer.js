const config = require('../config');
const { callAgent, trackUsage } = require('../agents/shared');

const SYSTEM_PROMPT = `You are a story summarizer. Given a sequence of story turns, produce a concise summary that preserves:
1. Key plot events and their consequences
2. Character developments and relationship changes
3. Important reveals or information
4. Emotional beats and tone shifts

Be concise but complete. 3-5 sentences maximum. Also list 3-6 key events as bullet points.

Return JSON:
{
  "summary": "narrative summary paragraph",
  "keyEvents": ["event 1", "event 2", ...]
}

Return ONLY the JSON object, no other text.`;

async function compress(turns, state) {
  if (!turns || turns.length === 0) return null;

  let userMessage = `Summarize these story turns:\n\n`;
  for (const turn of turns) {
    userMessage += `**Turn ${turn.turnNumber}**:\n`;
    if (turn.userInput) userMessage += `User action: ${turn.userInput}\n`;
    if (turn.output?.prose) {
      // Include first and last paragraph only to save tokens
      const paragraphs = turn.output.prose.split('\n').filter((p) => p.trim());
      const excerpt =
        paragraphs.length > 2
          ? `${paragraphs[0]}\n...\n${paragraphs[paragraphs.length - 1]}`
          : turn.output.prose;
      userMessage += `Scene excerpt: ${excerpt}\n`;
    }
    userMessage += '\n';
  }

  const { result, usage } = await callAgent({
    model: config.models.summarizer,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: config.maxTokens.summarizer,
  });

  if (state) {
    trackUsage(state, 'summarizer', usage, state.currentTurnNumber);
  }

  if (result && !result._parseError) {
    return {
      coversTurns: [turns[0].turnNumber, turns[turns.length - 1].turnNumber],
      summary: result.summary,
      keyEvents: result.keyEvents || [],
      tokenCount: usage.output,
    };
  }

  return null;
}

/**
 * Check if summarization is needed and return unsummarized turns.
 */
function getUnsummarizedTurns(state) {
  const { turns, summaries } = state;
  const summarizedUpTo = summaries.length > 0 ? Math.max(...summaries.map((s) => s.coversTurns[1])) : 0;

  const unsummarized = turns.filter((t) => t.turnNumber > summarizedUpTo);

  // Only summarize if we have enough unsummarized turns
  if (unsummarized.length >= config.storyLoop.summarizeInterval) {
    return unsummarized;
  }
  return null;
}

module.exports = { compress, getUnsummarizedTurns };
