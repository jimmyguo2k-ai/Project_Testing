const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../persistence/store');
const { createStoryState } = require('../models/story-state');
const { runTurn } = require('../engine/story-loop');

const router = Router();

// --- Session CRUD ---

// Create a new story session
router.post('/sessions', async (req, res) => {
  const { genre, world, tone, protagonistName, protagonistDescription, supportingCharacters, additionalNotes } =
    req.body;

  if (!genre || !world || !protagonistName) {
    return res.status(400).json({ error: 'genre, world, and protagonistName are required' });
  }

  const sessionId = uuidv4();
  const userSetup = {
    genre,
    world,
    tone: tone || '',
    protagonistName,
    protagonistDescription: protagonistDescription || '',
    supportingCharacters: supportingCharacters || [],
    additionalNotes: additionalNotes || '',
  };

  const state = createStoryState(sessionId, userSetup);
  await store.save(sessionId, state);

  res.json({ sessionId, createdAt: state.createdAt });
});

// List all sessions
router.get('/sessions', async (req, res) => {
  const sessions = await store.listSessions();
  res.json(sessions);
});

// Get session state
router.get('/sessions/:id/state', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const state = await store.load(req.params.id);
  res.json(state);
});

// Delete session
router.delete('/sessions/:id', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  await store.remove(req.params.id);
  res.json({ deleted: true });
});

// --- Story progression (SSE) ---

// Helper: run story loop and stream events via SSE
async function streamTurn(res, sessionId, userInput) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    for await (const event of runTurn(sessionId, userInput)) {
      if (event.phase === 'complete') {
        res.write(`event: scene\ndata: ${JSON.stringify(event.scene)}\n\n`);
        res.write(
          `event: done\ndata: ${JSON.stringify({ turnNumber: event.turnNumber, tokenUsage: event.tokenUsage })}\n\n`
        );
      } else if (event.phase === 'error') {
        res.write(`event: error\ndata: ${JSON.stringify({ message: event.message })}\n\n`);
      } else {
        res.write(`event: status\ndata: ${JSON.stringify(event)}\n\n`);
      }
    }
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
  }

  res.end();
}

// Initialize story (first turn — generates bible + first scene)
router.post('/sessions/:id/init', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  await streamTurn(res, req.params.id, null);
});

// User action turn
router.post('/sessions/:id/turn', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const { userInput } = req.body;
  await streamTurn(res, req.params.id, userInput || null);
});

// Auto-advance (no user input)
router.post('/sessions/:id/advance', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  await streamTurn(res, req.params.id, null);
});

// --- Backstage panel APIs ---

// Get story bible
router.get('/sessions/:id/bible', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const state = await store.load(req.params.id);
  res.json(state.bible);
});

// Get all director directives
router.get('/sessions/:id/directives', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const state = await store.load(req.params.id);
  const directives = state.turns.map((t) => ({
    turnNumber: t.turnNumber,
    userInput: t.userInput,
    directive: t.directive,
    timestamp: t.timestamp,
  }));
  res.json(directives);
});

// Get all turns with full data
router.get('/sessions/:id/turns', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const state = await store.load(req.params.id);
  res.json(state.turns);
});

// Get token usage stats
router.get('/sessions/:id/stats', async (req, res) => {
  if (!(await store.exists(req.params.id))) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const state = await store.load(req.params.id);
  res.json({
    tokenUsage: state.tokenUsage,
    currentTurnNumber: state.currentTurnNumber,
    bibleVersion: state.bibleVersion,
    lastBibleRefreshTurn: state.lastBibleRefreshTurn,
    summaries: state.summaries,
  });
});

module.exports = router;
