/**
 * Scene Output — output of the Actor agent each turn.
 * The actual prose, dialogue, and interaction hook shown to the user.
 */

function createEmptySceneOutput(turnNumber) {
  return {
    turnNumber,
    timestamp: new Date().toISOString(),

    prose: '',

    segments: [],
    // [{ type: 'narration' | 'dialogue', text, characterId?, delivery? }]

    interactionHook: {
      mode: 'explicit', // explicit | implicit
      prompt: '',
      suggestedActions: [],
    },

    metadata: {
      wordCount: 0,
      dominantMood: '',
      charactersPresent: [],
    },
  };
}

function validateSceneOutput(output) {
  if (!output) return { valid: false, error: 'Scene output is null' };
  if (!output.prose || output.prose.length === 0) {
    return { valid: false, error: 'Scene output must have prose' };
  }
  return { valid: true };
}

module.exports = { createEmptySceneOutput, validateSceneOutput };
