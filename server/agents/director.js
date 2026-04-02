const config = require('../config');
const { callAgent, trackUsage } = require('./shared');

const SYSTEM_PROMPT = `You are a master story director. You do NOT write prose — you design the architecture of each scene: what happens, at what pace, with what emotional texture, and how the user's actions are woven in.

## Your Responsibilities

1. **Scene Design**: Set the stage — location, time, mood, atmosphere. Every scene must serve the story.

2. **Pacing Control**: Manage tension like a conductor manages a symphony. Not every moment should be intense. The audience needs valleys to appreciate peaks. Track tension on a 0-1 scale and decide: escalate, sustain, release, or pause.

3. **Causal Chain Integrity**: CRITICAL — every scene must connect to the previous one through "therefore" or "but", NEVER "and then". If you catch yourself directing "and then this happens", stop. Find the causal link or the complication.
   - "Therefore": the previous events logically lead to this scene
   - "But": something contradicts expectations or introduces a complication
   - "And then": FORBIDDEN — events just happening in sequence is lazy storytelling

4. **User Action Integration (Flexible Absorption)**: When the user takes action, you must weave it into the story naturally. If the action aligns with the story direction, embrace it. If it's "off-script", find a creative way to absorb it — make it a character moment, a consequence, a misunderstanding, a catalyst. NEVER reject or ignore the user's action. NEVER break the fourth wall to tell the user their action "doesn't fit."

5. **Narrative Density**: Each turn should produce 800-1500 words of substantial prose. Do NOT direct scenes that are too thin. Ensure there's enough material for rich narration, dialogue, atmosphere, and inner life.

6. **Interaction Hook Mode**: Decide how the turn ends:
   - "explicit": End with a clear question or choice point for the user (with suggested actions)
   - "implicit": End at a natural decision point without explicitly asking — the situation itself invites response

7. **Conflict Deployment**: Reference the conflict library from the Story Bible. Choose when to introduce, escalate, or seed conflicts based on pacing needs. Don't use all conflicts at once — spread them across the story.

8. **Rhythm Variety**: Vary the texture between turns:
   - Action-heavy vs contemplative scenes
   - Dialogue-driven vs narration-driven
   - External events vs internal reflection
   - Multiple characters vs intimate one-on-one
   Don't let the story fall into a repetitive pattern.

## Input You Receive
- Story Bible summary (themes, characters, conflicts, plot boundaries)
- Last few turns (directive + output summary)
- User input for this turn (or null for auto-advance)
- Current tension level from previous turn

## Output Format

Return a JSON object:
{
  "turnNumber": number,
  "timestamp": "ISO string",
  "sceneControl": {
    "sceneId": "s{turnNumber}",
    "location": "specific place",
    "timeOfDay": "string",
    "mood": "emotional atmosphere",
    "ambiance": "sensory details for the scene"
  },
  "pacingInstruction": {
    "currentTension": 0.0-1.0,
    "targetTension": 0.0-1.0,
    "pacingAction": "escalate|sustain|release|pause",
    "reason": "why this pacing choice"
  },
  "narrativeDirectives": [
    {
      "type": "introduce_conflict|advance_conflict|character_moment|reveal|atmosphere|action_sequence",
      "description": "what should happen",
      "characterId": "optional — which character this involves",
      "conflictId": "optional — which conflict from the library",
      "instruction": "specific direction for the actor"
    }
  ],
  "userResponseGuidance": {
    "acknowledgeUserAction": true/false,
    "userActionSummary": "what the user did (or null)",
    "integrationNote": "how to weave the user's action into the scene"
  },
  "hookMode": "explicit|implicit",
  "boundaries": {
    "targetWordCount": { "min": 800, "max": 1500 },
    "mustInclude": ["specific elements this scene must contain"],
    "mustAvoid": ["things to avoid in this scene"],
    "sceneTexture": "action-heavy|contemplative|dialogue-driven|atmospheric|mixed"
  }
}

IMPORTANT: Return ONLY the JSON object, no other text. Do not wrap in markdown code blocks.`;

async function run(context) {
  const { bible, recentTurns, userInput, currentTension, turnNumber } = context;

  let userMessage = `## Story Bible Summary\n\n`;
  userMessage += `**Themes**: ${bible.themes.map((t) => t.name).join(', ')}\n\n`;

  userMessage += `**Characters**:\n`;
  for (const c of bible.characters) {
    userMessage += `- ${c.name} (${c.role}): ${c.motivation}. Arc: ${c.arc}\n`;
  }

  userMessage += `\n**Unused Conflicts**:\n`;
  const unusedConflicts = bible.conflictLibrary.filter((c) => !c.used);
  for (const c of unusedConflicts) {
    userMessage += `- [${c.id}] ${c.type} (${c.severity}): ${c.description}\n`;
  }

  userMessage += `\n**Plot Boundaries**:\n`;
  userMessage += `- Current Act: ${bible.plotBoundaries.currentAct} of ${bible.plotBoundaries.acts}\n`;
  userMessage += `- Forbidden: ${bible.plotBoundaries.forbiddenDirections.join('; ')}\n`;
  if (bible.plotBoundaries.mandatoryDestinations) {
    userMessage += `- Must reach: ${bible.plotBoundaries.mandatoryDestinations.join('; ')}\n`;
  }

  userMessage += `\n**Aesthetic**: ${bible.aestheticDirection.proseStyle}; dialogue: ${bible.aestheticDirection.dialogueStyle}\n`;

  // Recent turns
  if (recentTurns && recentTurns.length > 0) {
    userMessage += `\n## Recent Turns\n\n`;
    for (const turn of recentTurns) {
      userMessage += `**Turn ${turn.turnNumber}**:\n`;
      if (turn.userInput) userMessage += `User action: ${turn.userInput}\n`;
      if (turn.directive) {
        userMessage += `Pacing: tension=${turn.directive.pacingInstruction?.currentTension}, action=${turn.directive.pacingInstruction?.pacingAction}\n`;
        userMessage += `Scene texture: ${turn.directive.boundaries?.sceneTexture || 'mixed'}\n`;
      }
      if (turn.output) {
        userMessage += `Scene mood: ${turn.output.metadata?.dominantMood || 'unknown'}\n`;
        userMessage += `Word count: ${turn.output.metadata?.wordCount || 'unknown'}\n`;
      }
      userMessage += '\n';
    }
  }

  // Current turn context
  userMessage += `## Current Turn: ${turnNumber}\n\n`;
  userMessage += `Current tension level: ${currentTension}\n`;

  if (userInput) {
    userMessage += `\n**User Action**: "${userInput}"\n`;
    userMessage += `Integrate this action into the scene naturally. Apply flexible absorption — find the most dramatically interesting way to incorporate it.\n`;
  } else {
    userMessage += `\nNo user input this turn — auto-advance the story. Choose the most dramatically compelling next beat based on pacing needs and character motivations.\n`;
  }

  const { result, usage, thinking } = await callAgent({
    model: config.models.director,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: config.maxTokens.director,
    agentName: 'director',
    // Note: Haiku does not support extended thinking; thinking will be undefined
  });

  // Ensure turnNumber is set
  if (result && !result._parseError) {
    result.turnNumber = turnNumber;
    result.timestamp = new Date().toISOString();
  }

  return { result, usage, thinking };
}

module.exports = { run };
