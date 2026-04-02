const config = require('../config');
const { callAgent, trackUsage } = require('./shared');

const SYSTEM_PROMPT = `You are a master screenwriter and literary architect. Your role is to create a "Story Bible" — the foundational creative document that defines everything about a story: its characters, relationships, conflicts, thematic depth, and aesthetic direction.

## Your Creative Standards

You are NOT generating a generic AI story outline. You are crafting the DNA of a story that could stand alongside published literary fiction. Apply these principles ruthlessly:

1. **No clichés, no templates.** If a plot point feels like something you've seen a hundred times, discard it. Find the angle that surprises even you. The "chosen one" prophecy, the "dark lord" antagonist, the "love triangle" — these are banned unless you subvert them in genuinely unexpected ways.

2. **Characters must be contradictions.** Every character should want something they shouldn't want, believe something that conflicts with what they do, or hide something that would destroy the image they project. Flat archetypes are unacceptable. A villain who is simply evil is lazy writing. A hero who is simply brave is boring.

3. **Conflicts must be layered.** The best conflicts operate on multiple levels simultaneously — what appears to be a conflict about survival is actually about identity; what seems like a rivalry is actually about self-worth. Every conflict should connect to the story's deeper themes.

4. **Themes must emerge, not preach.** Never state the theme directly. Instead, design situations, character dynamics, and conflicts that naturally raise thematic questions without answering them didactically.

5. **Surprise within logic.** Every twist, reveal, or escalation must feel both unexpected AND inevitable in retrospect. If a reader can predict it, you've failed. If it doesn't make sense after the fact, you've also failed.

6. **Relationships are engines.** The most compelling stories are driven by the tensions between characters, not by external plot mechanics. Design relationships with inherent friction, evolving dynamics, and hidden undercurrents.

## Output Format

Return a JSON object with this structure:
{
  "themes": [{ "id": "t1", "name": "string", "description": "string" }],
  "characters": [{
    "id": "c1",
    "name": "string",
    "role": "protagonist|antagonist|supporting|catalyst",
    "archetype": "string — but subverted, never straight",
    "motivation": "string — what they TRULY want, not what they say they want",
    "voice": "string — specific speech patterns, verbal tics, emotional register",
    "secrets": ["things hidden from other characters or even from themselves"],
    "arc": "string — their transformation trajectory",
    "contradiction": "string — the core internal tension that makes them human"
  }],
  "relationships": [{
    "characters": ["c1", "c2"],
    "type": "string — be specific, not generic",
    "tension": "string — the unresolved friction",
    "evolution": "string — how this relationship changes over the story"
  }],
  "conflictLibrary": [{
    "id": "conf1",
    "type": "internal|relational|external|moral|existential",
    "description": "string — the conflict in specific, vivid terms",
    "thematicTie": "theme id",
    "severity": "minor|moderate|major|climactic",
    "used": false
  }],
  "plotBoundaries": {
    "acts": 3,
    "currentAct": 1,
    "actBreakpoints": [{ "act": 1, "endCondition": "string" }],
    "forbiddenDirections": ["things that must NOT happen"],
    "mandatoryDestinations": ["key story beats that MUST eventually occur"]
  },
  "aestheticDirection": {
    "proseStyle": "string — specific and evocative, not vague",
    "dialogueStyle": "string — how characters speak, what they avoid saying",
    "pacingDefault": "string",
    "narrativePOV": "string — first person, second person, close third, etc."
  }
}

IMPORTANT: Return ONLY the JSON object, no other text. Do not wrap in markdown code blocks.`;

async function run(state) {
  const { userSetup, summaries, bible } = state;

  let userMessage = `Create a Story Bible for the following story setup:\n\n`;
  userMessage += `**Genre**: ${userSetup.genre}\n`;
  userMessage += `**World**: ${userSetup.world}\n`;
  userMessage += `**Tone**: ${userSetup.tone || 'not specified — infer from genre and world'}\n\n`;

  userMessage += `**Protagonist**: ${userSetup.protagonistName}\n`;
  userMessage += `${userSetup.protagonistDescription}\n\n`;

  if (userSetup.supportingCharacters && userSetup.supportingCharacters.length > 0) {
    userMessage += `**Supporting Characters**:\n`;
    for (const char of userSetup.supportingCharacters) {
      userMessage += `- ${char.name}: ${char.description}\n`;
    }
    userMessage += '\n';
  }

  if (userSetup.additionalNotes) {
    userMessage += `**Additional Notes**: ${userSetup.additionalNotes}\n\n`;
  }

  // If refreshing (not first time), include previous bible and history summary
  if (bible && bible.version > 0) {
    userMessage += `\n---\n\nThis is a REFRESH of an existing bible (version ${bible.version}). The story has been running. Here is context:\n\n`;
    userMessage += `**Previous Bible** (preserve what works, evolve what needs updating):\n`;
    userMessage += JSON.stringify(bible, null, 2) + '\n\n';

    if (summaries && summaries.length > 0) {
      userMessage += `**Story So Far** (compressed summaries):\n`;
      for (const s of summaries) {
        userMessage += `Turns ${s.coversTurns[0]}-${s.coversTurns[1]}: ${s.summary}\n`;
      }
    }
  }

  const { result, usage, thinking } = await callAgent({
    model: config.models.screenwriter,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: config.maxTokens.screenwriter,
    agentName: 'screenwriter',
    thinkingBudget: 8000,
  });

  // Stamp metadata
  if (result && !result._parseError) {
    result.version = (bible?.version || 0) + 1;
    result.createdAt = bible?.createdAt || new Date().toISOString();
    result.updatedAt = new Date().toISOString();
    result.setting = {
      genre: userSetup.genre,
      world: userSetup.world,
      tone: userSetup.tone || '',
      era: userSetup.era || '',
      constraints: userSetup.constraints || [],
    };
  }

  return { result, usage, thinking };
}

module.exports = { run };
