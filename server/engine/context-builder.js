const config = require('../config');

/**
 * Build minimal context for the Director agent.
 */
function forDirector(state, userInput) {
  const { bible, turns, currentTurnNumber } = state;
  const turnNumber = currentTurnNumber + 1;

  // Get last N turns for context
  const recentCount = config.storyLoop.recentTurnsForDirector;
  const recentTurns = turns.slice(-recentCount).map((t) => ({
    turnNumber: t.turnNumber,
    userInput: t.userInput,
    directive: t.directive
      ? {
          pacingInstruction: t.directive.pacingInstruction,
          boundaries: t.directive.boundaries,
          hookMode: t.directive.hookMode,
        }
      : null,
    output: t.output
      ? {
          metadata: t.output.metadata,
        }
      : null,
  }));

  // Get current tension from last turn
  const lastTurn = turns[turns.length - 1];
  const currentTension = lastTurn?.directive?.pacingInstruction?.currentTension || 0.3;

  return {
    bible,
    recentTurns,
    userInput,
    currentTension,
    turnNumber,
  };
}

/**
 * Build minimal context for the Actor agent.
 */
function forActor(state, directive, userInput) {
  const { bible, turns } = state;

  // Only the last turn's output for continuity
  const lastTurn = turns[turns.length - 1];
  const previousOutput = lastTurn?.output || null;

  return {
    directive,
    bible,
    previousOutput,
    userInput,
  };
}

module.exports = { forDirector, forActor };
