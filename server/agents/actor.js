const config = require('../config');
const { callAgent, trackUsage } = require('./shared');

const SYSTEM_PROMPT = `You are a master literary performer — a narrator and actor who brings stories to life through vivid prose, authentic dialogue, and immersive atmosphere. You receive scene directives from a director and transform them into published-quality fiction.

## Your Creative Principles

1. **Show, never tell.** Don't say a character is angry — show the whitening knuckles, the measured breathing, the words chosen with surgical precision. Don't say a place is eerie — make the reader feel the silence pressing against their eardrums.

2. **Dialogue must reveal.** Every line of dialogue should do at least TWO of these: advance the plot, reveal character, create tension, convey information the reader needs. Small talk is only acceptable if it's masking something deeper. Characters should talk past each other, interrupt, deflect, and lie.

3. **Prose has rhythm.** Vary sentence length. Short punches for impact. Longer, flowing sentences to build atmosphere or convey contemplation. Sentence structure should mirror emotional content — choppy during tension, fluid during intimacy or reflection.

4. **The user is the protagonist.** Write the protagonist's actions and perceptions, but NEVER their inner thoughts unless they align with what the user has expressed. The protagonist does what the user says they do. When no user input is given, move the protagonist naturally based on their established character and the situation.

5. **Substantial prose.** Each turn must be 800-1500 words. This is a novel, not a chat. Include rich description, internal sensation, atmospheric detail, and meaningful dialogue. Don't rush.

6. **Second person present tense** (unless the aesthetic direction specifies otherwise). "You step into the corridor. The air tastes of copper and old rain."

7. **Interaction hooks are organic.** When the mode is "explicit", end with a natural moment where the protagonist faces a choice — but phrase it as part of the narrative, not as a game prompt. When the mode is "implicit", simply end at a moment pregnant with possibility. Never use formatting like "Option A / Option B" — weave choices into the narrative.

## What You Receive
- Director's directive (scene setting, pacing, narrative instructions, what to include/avoid)
- Story's aesthetic direction (prose style, dialogue style)
- Character definitions for characters present in this scene
- Previous turn's prose (for continuity)
- User's input action (if any)

## Output Format

Return a JSON object:
{
  "prose": "The full prose text of this scene turn. 800-1500 words. Rich, immersive, literary quality.",
  "segments": [
    {
      "type": "narration|dialogue",
      "text": "segment text",
      "characterId": "for dialogue — which character speaks",
      "delivery": "for dialogue — how it's said (whispered, snapped, etc.)"
    }
  ],
  "interactionHook": {
    "mode": "explicit|implicit",
    "prompt": "For explicit: the narrative question posed. For implicit: empty string.",
    "suggestedActions": ["For explicit: 2-3 natural actions the protagonist might take. For implicit: empty array."]
  },
  "metadata": {
    "wordCount": number,
    "dominantMood": "the emotional atmosphere of this scene",
    "charactersPresent": ["character IDs present in this scene"]
  }
}

IMPORTANT: Return ONLY the JSON object, no other text. Do not wrap in markdown code blocks.
IMPORTANT: The "prose" field must contain the COMPLETE prose text. Do not abbreviate or truncate it.`;

async function run(context) {
  const { directive, bible, previousOutput, userInput } = context;

  let userMessage = `## Director's Directive\n\n`;
  userMessage += JSON.stringify(directive, null, 2);

  userMessage += `\n\n## Aesthetic Direction\n\n`;
  userMessage += `Prose style: ${bible.aestheticDirection.proseStyle}\n`;
  userMessage += `Dialogue style: ${bible.aestheticDirection.dialogueStyle}\n`;
  userMessage += `Narrative POV: ${bible.aestheticDirection.narrativePOV || 'second person present tense'}\n`;

  // Include only characters relevant to this scene
  const presentCharIds = new Set();
  if (directive.narrativeDirectives) {
    for (const nd of directive.narrativeDirectives) {
      if (nd.characterId) presentCharIds.add(nd.characterId);
    }
  }
  // Always include protagonist
  const protagonist = bible.characters.find((c) => c.role === 'protagonist');
  if (protagonist) presentCharIds.add(protagonist.id);

  const presentChars = bible.characters.filter((c) => presentCharIds.has(c.id));
  if (presentChars.length > 0) {
    userMessage += `\n## Characters in This Scene\n\n`;
    for (const c of presentChars) {
      userMessage += `**${c.name}** (${c.role})\n`;
      userMessage += `- Voice: ${c.voice}\n`;
      userMessage += `- Motivation: ${c.motivation}\n`;
      userMessage += `- Contradiction: ${c.contradiction || 'N/A'}\n`;
      userMessage += `- Current arc: ${c.arc}\n\n`;
    }
  }

  // Continuity — previous turn's prose (truncated)
  if (previousOutput && previousOutput.prose) {
    const lastParagraphs = previousOutput.prose.split('\n').slice(-5).join('\n');
    userMessage += `\n## Previous Scene (last portion for continuity)\n\n${lastParagraphs}\n`;
  }

  // User action
  if (userInput) {
    userMessage += `\n## User's Action\n\nThe protagonist (controlled by the user) does: "${userInput}"\n`;
    userMessage += `Integrate this naturally. The protagonist's action should feel like a seamless part of the narrative.\n`;
  } else {
    userMessage += `\n## No User Input\n\nThe protagonist acts on their own based on character and situation. Advance the scene naturally.\n`;
  }

  userMessage += `\n## Requirements\n`;
  userMessage += `- Word count: ${directive.boundaries?.targetWordCount?.min || 800}-${directive.boundaries?.targetWordCount?.max || 1500} words\n`;
  userMessage += `- Hook mode: ${directive.hookMode || 'explicit'}\n`;
  if (directive.boundaries?.mustInclude?.length > 0) {
    userMessage += `- Must include: ${directive.boundaries.mustInclude.join(', ')}\n`;
  }
  if (directive.boundaries?.mustAvoid?.length > 0) {
    userMessage += `- Must avoid: ${directive.boundaries.mustAvoid.join(', ')}\n`;
  }

  const { result, usage, thinking } = await callAgent({
    model: config.models.actor,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: config.maxTokens.actor,
    agentName: 'actor',
    thinkingBudget: 4000,
  });

  return { result, usage, thinking };
}

/**
 * Streaming version — yields text chunks as they arrive, then returns full result.
 * Use this for real-time display in the UI.
 */
async function* runStream(context) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const { directive, bible, previousOutput, userInput } = context;

  let userMessage = `## Director's Directive\n\n`;
  userMessage += JSON.stringify(directive, null, 2);
  userMessage += `\n\n## Aesthetic Direction\n\n`;
  userMessage += `Prose style: ${bible.aestheticDirection.proseStyle}\n`;
  userMessage += `Dialogue style: ${bible.aestheticDirection.dialogueStyle}\n`;
  userMessage += `Narrative POV: ${bible.aestheticDirection.narrativePOV || 'second person present tense'}\n`;

  const presentCharIds = new Set();
  if (directive.narrativeDirectives) {
    for (const nd of directive.narrativeDirectives) {
      if (nd.characterId) presentCharIds.add(nd.characterId);
    }
  }
  const protagonist = bible.characters.find((c) => c.role === 'protagonist');
  if (protagonist) presentCharIds.add(protagonist.id);

  const presentChars = bible.characters.filter((c) => presentCharIds.has(c.id));
  if (presentChars.length > 0) {
    userMessage += `\n## Characters in This Scene\n\n`;
    for (const c of presentChars) {
      userMessage += `**${c.name}** (${c.role})\n- Voice: ${c.voice}\n- Motivation: ${c.motivation}\n- Arc: ${c.arc}\n\n`;
    }
  }

  if (previousOutput && previousOutput.prose) {
    const lastParagraphs = previousOutput.prose.split('\n').slice(-4).join('\n');
    userMessage += `\n## Previous Scene (last portion)\n\n${lastParagraphs}\n`;
  }

  if (userInput) {
    userMessage += `\n## User's Action\n\nThe protagonist does: "${userInput}"\nIntegrate naturally.\n`;
  } else {
    userMessage += `\n## No User Input\n\nAdvance naturally based on character and situation.\n`;
  }

  userMessage += `\n## Requirements\n`;
  userMessage += `- Word count: ${directive.boundaries?.targetWordCount?.min || 800}-${directive.boundaries?.targetWordCount?.max || 1500} words\n`;
  userMessage += `- Hook mode: ${directive.hookMode || 'explicit'}\n`;

  console.log(`\n[actor] Streaming response from ${config.models.actor} (with thinking)...`);

  let fullText = '';
  let thinkingText = '';
  const stream = client.messages.stream({
    model: config.models.actor,
    max_tokens: config.maxTokens.actor,
    thinking: { type: 'enabled', budget_tokens: 4000 },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      if (chunk.delta?.type === 'text_delta') {
        fullText += chunk.delta.text;
        yield { type: 'chunk', text: chunk.delta.text };
      } else if (chunk.delta?.type === 'thinking_delta') {
        thinkingText += chunk.delta.thinking;
        yield { type: 'thinking_chunk', text: chunk.delta.thinking };
      }
    }
  }

  const finalMessage = await stream.finalMessage();
  const usage = {
    input: finalMessage.usage?.input_tokens || 0,
    output: finalMessage.usage?.output_tokens || 0,
  };

  console.log(`[actor] Stream complete. Tokens: ${usage.input} in / ${usage.output} out`);

  // Parse the full JSON result
  // Try parsing the accumulated text
  let result;
  try {
    result = JSON.parse(fullText.trim());
  } catch (e) {
    // Try extracting from code block
    const match = fullText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (match) {
      try { result = JSON.parse(match[1].trim()); } catch (e2) { /* */ }
    }
    if (!result) {
      const first = fullText.indexOf('{');
      const last = fullText.lastIndexOf('}');
      if (first !== -1 && last > first) {
        try { result = JSON.parse(fullText.slice(first, last + 1)); } catch (e2) { /* */ }
      }
    }
  }

  yield {
    type: 'complete',
    result: result || { _raw: fullText, _parseError: 'Failed to parse actor JSON' },
    usage,
    thinking: thinkingText,
  };
}

module.exports = { run, runStream };
