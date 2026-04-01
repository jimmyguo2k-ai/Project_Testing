const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'sessions');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(sessionId) {
  return path.join(DATA_DIR, `${sessionId}.json`);
}

async function save(sessionId, state) {
  await ensureDir();
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(sessionPath(sessionId), JSON.stringify(state, null, 2), 'utf-8');
}

async function load(sessionId) {
  const data = await fs.readFile(sessionPath(sessionId), 'utf-8');
  return JSON.parse(data);
}

async function exists(sessionId) {
  try {
    await fs.access(sessionPath(sessionId));
    return true;
  } catch {
    return false;
  }
}

async function remove(sessionId) {
  await fs.unlink(sessionPath(sessionId));
}

async function listSessions() {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const sessions = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf-8'));
    sessions.push({
      sessionId: data.sessionId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      currentTurnNumber: data.currentTurnNumber,
      genre: data.userSetup?.genre || '',
      world: data.userSetup?.world?.slice(0, 100) || '',
    });
  }
  return sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

module.exports = { save, load, exists, remove, listSessions };
