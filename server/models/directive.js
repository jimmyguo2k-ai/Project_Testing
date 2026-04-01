/**
 * Director Directive — output of the Director agent each turn.
 * Controls scene pacing, narrative flow, and interaction mode.
 */

function createEmptyDirective(turnNumber) {
  return {
    turnNumber,
    timestamp: new Date().toISOString(),

    sceneControl: {
      sceneId: '',
      location: '',
      timeOfDay: '',
      mood: '',
      ambiance: '',
    },

    pacingInstruction: {
      currentTension: 0.5,
      targetTension: 0.5,
      pacingAction: 'sustain', // escalate | sustain | release | pause
      reason: '',
    },

    narrativeDirectives: [],
    // [{ type, description, characterId?, conflictId?, instruction }]
    // type: introduce_conflict | advance_conflict | character_moment | reveal | atmosphere

    userResponseGuidance: {
      acknowledgeUserAction: false,
      userActionSummary: '',
      integrationNote: '',
    },

    hookMode: 'explicit', // explicit | implicit

    boundaries: {
      targetWordCount: { min: 800, max: 1500 },
      mustInclude: [],
      mustAvoid: [],
    },
  };
}

function validateDirective(directive) {
  if (!directive) return { valid: false, error: 'Directive is null' };
  if (!directive.sceneControl) return { valid: false, error: 'Missing sceneControl' };
  if (!directive.pacingInstruction) return { valid: false, error: 'Missing pacingInstruction' };
  return { valid: true };
}

module.exports = { createEmptyDirective, validateDirective };
