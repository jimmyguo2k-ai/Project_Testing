/**
 * Full Story State — the aggregate of all story data for a session.
 */

const { createEmptyBible } = require('./story-bible');

function createStoryState(sessionId, userSetup) {
  return {
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    userSetup,
    // { genre, world, tone, protagonistName, protagonistDescription, supportingCharacters, additionalNotes }

    bible: createEmptyBible(),
    latestDirective: null,

    turns: [],
    // [{ turnNumber, userInput, directive, output, timestamp }]

    summaries: [],
    // [{ coversTurns: [from, to], summary, keyEvents, tokenCount }]

    currentTurnNumber: 0,
    bibleVersion: 0,
    lastBibleRefreshTurn: 0,

    // Token tracking for backstage panel
    tokenUsage: {
      total: { input: 0, output: 0 },
      byAgent: {
        screenwriter: { input: 0, output: 0, calls: 0 },
        director: { input: 0, output: 0, calls: 0 },
        actor: { input: 0, output: 0, calls: 0 },
        summarizer: { input: 0, output: 0, calls: 0 },
      },
      byTurn: [],
      // [{ turnNumber, screenwriter?, director, actor, totalInput, totalOutput, timestamp }]
    },
  };
}

module.exports = { createStoryState };
