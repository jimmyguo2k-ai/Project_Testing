/**
 * Story Bible — output of the Screenwriter agent.
 * Defines the story's DNA: characters, relationships, conflicts, boundaries, aesthetics.
 */

function createEmptyBible() {
  return {
    version: 0,
    createdAt: null,
    updatedAt: null,

    setting: {
      genre: '',
      world: '',
      tone: '',
      era: '',
      constraints: [],
    },

    themes: [],
    // [{ id, name, description }]

    characters: [],
    // [{ id, name, role, archetype, motivation, voice, secrets, arc }]

    relationships: [],
    // [{ characters: [id, id], type, tension, evolution }]

    conflictLibrary: [],
    // [{ id, type, description, thematicTie, severity, used }]

    plotBoundaries: {
      acts: 3,
      currentAct: 1,
      actBreakpoints: [],
      // [{ act, endCondition }]
      forbiddenDirections: [],
    },

    aestheticDirection: {
      proseStyle: '',
      dialogueStyle: '',
      pacingDefault: '',
    },
  };
}

function validateBible(bible) {
  if (!bible) return { valid: false, error: 'Bible is null' };
  if (!bible.characters || bible.characters.length === 0) {
    return { valid: false, error: 'Bible must have at least one character' };
  }
  if (!bible.conflictLibrary || bible.conflictLibrary.length === 0) {
    return { valid: false, error: 'Bible must have at least one conflict' };
  }
  if (!bible.themes || bible.themes.length === 0) {
    return { valid: false, error: 'Bible must have at least one theme' };
  }
  return { valid: true };
}

module.exports = { createEmptyBible, validateBible };
