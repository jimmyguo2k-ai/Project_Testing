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
 * Event phases: screenwriter | director | actor | thinking_chunk | chunk | complete | error
 */
async function* runTurn(sessionId, userInput = null) {
  const state = await store.load(sessionId);
  const turnNumber = state.currentTurnNumber + 1;

  // Thinking storage for this turn
  const thinkingLog = {};

  // 1. Conditionally refresh bible (Screenwriter)
  const turnsSinceRefresh = turnNumber - state.lastBibleRefreshTurn;
  const needsRefresh = turnsSinceRefresh >= config.storyLoop.bibleRefreshInterval || state.bibleVersion === 0;

  if (needsRefresh) {
    yield { phase: 'screenwriter', message: '编剧正在构建故事圣经...' };
    const { result: bibleResult, usage: bibleUsage, thinking: bibleThinking } = await screenwriter.run(state);
    trackUsage(state, 'screenwriter', bibleUsage, turnNumber);

    if (bibleThinking) {
      thinkingLog.screenwriter = bibleThinking;
      yield { phase: 'thinking', agent: 'screenwriter', thinking: bibleThinking };
    }

    const validation = validateBible(bibleResult);
    if (validation.valid) {
      state.bible = bibleResult;
      state.bibleVersion = bibleResult.version || state.bibleVersion + 1;
      state.lastBibleRefreshTurn = turnNumber;
    } else {
      yield { phase: 'error', message: `编剧输出验证失败: ${validation.error}` };
      if (state.bibleVersion === 0) throw new Error(`Initial bible generation failed: ${validation.error}`);
    }
  }

  // 2. Summarize if needed
  const unsummarized = summarizer.getUnsummarizedTurns(state);
  if (unsummarized) {
    yield { phase: 'summarizer', message: '正在压缩历史...' };
    const summary = await summarizer.compress(unsummarized, state);
    if (summary) state.summaries.push(summary);
  }

  // 3. Run Director (Haiku — fast)
  yield { phase: 'director', message: '导演正在设计场景...' };
  const directorContext = contextBuilder.forDirector(state, userInput);
  const { result: directiveResult, usage: directorUsage, thinking: directorThinking } = await director.run(directorContext);
  trackUsage(state, 'director', directorUsage, turnNumber);

  if (directorThinking) {
    thinkingLog.director = directorThinking;
    yield { phase: 'thinking', agent: 'director', thinking: directorThinking };
  }

  if (directiveResult._parseError) {
    yield { phase: 'error', message: `导演输出解析失败: ${directiveResult._parseError}` };
    directiveResult.sceneControl = directiveResult.sceneControl || { location: 'unknown', mood: 'neutral' };
    directiveResult.pacingInstruction = directiveResult.pacingInstruction || { currentTension: 0.5, targetTension: 0.5, pacingAction: 'sustain' };
    directiveResult.hookMode = 'explicit';
    directiveResult.boundaries = { targetWordCount: { min: 800, max: 1500 }, mustInclude: [], mustAvoid: [] };
    directiveResult.narrativeDirectives = [];
    directiveResult.userResponseGuidance = { acknowledgeUserAction: !!userInput, userActionSummary: userInput, integrationNote: 'integrate naturally' };
  }
  state.latestDirective = directiveResult;

  // 4. Run Actor with streaming + thinking
  yield { phase: 'actor', message: '演员正在演绎场景...' };
  const actorContext = contextBuilder.forActor(state, directiveResult, userInput);

  let sceneResult = null;
  let actorUsage = { input: 0, output: 0 };
  let actorThinking = '';

  for await (const event of actor.runStream(actorContext)) {
    if (event.type === 'thinking_chunk') {
      actorThinking += event.text;
      yield { phase: 'thinking_chunk', text: event.text };
    } else if (event.type === 'chunk') {
      yield { phase: 'chunk', text: event.text };
    } else if (event.type === 'complete') {
      sceneResult = event.result;
      actorUsage = event.usage;
      if (event.thinking) actorThinking = event.thinking;
    }
  }

  if (actorThinking) thinkingLog.actor = actorThinking;
  trackUsage(state, 'actor', actorUsage, turnNumber);

  if (!sceneResult || sceneResult._parseError) {
    yield { phase: 'error', message: `演员输出解析失败: ${sceneResult?._parseError || 'no result'}` };
    if (sceneResult?._raw) {
      sceneResult = {
        prose: sceneResult._raw,
        segments: [],
        interactionHook: { mode: 'explicit', prompt: '', suggestedActions: [] },
        metadata: { wordCount: sceneResult._raw.split(/\s+/).length, dominantMood: 'unknown', charactersPresent: [] },
      };
    }
  }

  // 5. Record turn (with thinking log)
  const turn = {
    turnNumber,
    userInput,
    directive: directiveResult,
    output: sceneResult,
    thinking: thinkingLog,
    timestamp: new Date().toISOString(),
  };
  state.turns.push(turn);
  state.currentTurnNumber = turnNumber;

  await store.save(sessionId, state);

  yield {
    phase: 'complete',
    scene: sceneResult,
    turnNumber,
    tokenUsage: state.tokenUsage.byTurn.find((t) => t.turnNumber === turnNumber),
  };
}

module.exports = { runTurn };
