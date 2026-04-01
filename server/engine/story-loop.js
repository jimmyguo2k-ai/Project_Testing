const config = require('../config');
const screenwriter = require('../agents/screenwriter');
const director = require('../agents/director');
const actor = require('../agents/actor');
const { trackUsage } = require('../agents/shared');
const contextBuilder = require('./context-builder');
const summarizer = require('./summarizer');
const store = require('../persistence/store');
const { validateBible } = require('../models/story-bible');

/**
 * Run a single turn of the story loop.
 * Async generator — yields progress events for SSE streaming.
 */
async function* runTurn(sessionId, userInput = null) {
  // 1. Load state
  const state = await store.load(sessionId);
  const turnNumber = state.currentTurnNumber + 1;

  // 2. Conditionally refresh bible
  const turnsSinceRefresh = turnNumber - state.lastBibleRefreshTurn;
  const needsRefresh = turnsSinceRefresh >= config.storyLoop.bibleRefreshInterval || state.bibleVersion === 0;

  if (needsRefresh) {
    yield { phase: 'screenwriter', message: '编剧正在构建故事圣经...' };
    const { result: bibleResult, usage: bibleUsage } = await screenwriter.run(state);
    trackUsage(state, 'screenwriter', bibleUsage, turnNumber);

    const validation = validateBible(bibleResult);
    if (validation.valid) {
      state.bible = bibleResult;
      state.bibleVersion = bibleResult.version || state.bibleVersion + 1;
      state.lastBibleRefreshTurn = turnNumber;
    } else {
      yield { phase: 'error', message: `编剧输出验证失败: ${validation.error}`, data: bibleResult };
      // Continue with existing bible if we have one
      if (state.bibleVersion === 0) {
        throw new Error(`Initial bible generation failed: ${validation.error}`);
      }
    }
  }

  // 3. Summarize if needed
  const unsummarized = summarizer.getUnsummarizedTurns(state);
  if (unsummarized) {
    yield { phase: 'summarizer', message: '正在压缩历史...' };
    const summary = await summarizer.compress(unsummarized, state);
    if (summary) {
      state.summaries.push(summary);
    }
  }

  // 4. Run director
  yield { phase: 'director', message: '导演正在设计场景...' };
  const directorContext = contextBuilder.forDirector(state, userInput);
  const { result: directiveResult, usage: directorUsage } = await director.run(directorContext);
  trackUsage(state, 'director', directorUsage, turnNumber);

  if (directiveResult._parseError) {
    yield { phase: 'error', message: `导演输出解析失败: ${directiveResult._parseError}` };
  }

  state.latestDirective = directiveResult;

  // 5. Run actor
  yield { phase: 'actor', message: '演员正在演绎场景...' };
  const actorContext = contextBuilder.forActor(state, directiveResult, userInput);
  const { result: sceneResult, usage: actorUsage } = await actor.run(actorContext);
  trackUsage(state, 'actor', actorUsage, turnNumber);

  if (sceneResult._parseError) {
    yield { phase: 'error', message: `演员输出解析失败: ${sceneResult._parseError}` };
  }

  // 6. Record turn
  const turn = {
    turnNumber,
    userInput,
    directive: directiveResult,
    output: sceneResult,
    timestamp: new Date().toISOString(),
  };
  state.turns.push(turn);
  state.currentTurnNumber = turnNumber;

  // 7. Persist
  await store.save(sessionId, state);

  // 8. Yield final result
  yield {
    phase: 'complete',
    scene: sceneResult,
    turnNumber,
    tokenUsage: state.tokenUsage.byTurn.find((t) => t.turnNumber === turnNumber),
  };
}

module.exports = { runTurn };
