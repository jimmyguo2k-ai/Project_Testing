const API_BASE = '/api';

export async function createSession(setup) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(setup),
  });
  return res.json();
}

export async function listSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  return res.json();
}

export async function getSessionState(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/state`);
  return res.json();
}

export async function deleteSession(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getBible(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/bible`);
  return res.json();
}

export async function getDirectives(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/directives`);
  return res.json();
}

export async function getTurns(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/turns`);
  return res.json();
}

export async function getStats(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/stats`);
  return res.json();
}

/**
 * Stream a story turn via SSE.
 * Returns a cleanup function.
 * Callbacks: onStatus, onScene, onDone, onError
 */
export function streamTurn(sessionId, endpoint, { onStatus, onScene, onDone, onError }) {
  const controller = new AbortController();

  const url = `${API_BASE}/sessions/${sessionId}/${endpoint}`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: endpoint === 'turn' ? JSON.stringify({ userInput: arguments[2]?.userInput }) : '{}',
    signal: controller.signal,
  })
    .then((response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = null;
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                if (eventType === 'status') onStatus?.(data);
                else if (eventType === 'scene') onScene?.(data);
                else if (eventType === 'done') onDone?.(data);
                else if (eventType === 'error') onError?.(data);
              } catch (e) {
                // ignore parse errors in stream
              }
              eventType = null;
            }
          }

          read();
        });
      }

      read();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.({ message: err.message });
      }
    });

  return () => controller.abort();
}

/**
 * Higher-level: init story or submit turn, with proper body.
 */
export function initStory(sessionId, callbacks) {
  const controller = new AbortController();

  fetch(`${API_BASE}/sessions/${sessionId}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal: controller.signal,
  })
    .then((response) => processSSE(response, callbacks))
    .catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.({ message: err.message });
    });

  return () => controller.abort();
}

export function submitTurn(sessionId, userInput, callbacks) {
  const controller = new AbortController();

  fetch(`${API_BASE}/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput }),
    signal: controller.signal,
  })
    .then((response) => processSSE(response, callbacks))
    .catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.({ message: err.message });
    });

  return () => controller.abort();
}

export function advanceStory(sessionId, callbacks) {
  const controller = new AbortController();

  fetch(`${API_BASE}/sessions/${sessionId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal: controller.signal,
  })
    .then((response) => processSSE(response, callbacks))
    .catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.({ message: err.message });
    });

  return () => controller.abort();
}

function processSSE(response, { onStatus, onChunk, onScene, onDone, onError }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function read() {
    reader.read().then(({ done, value }) => {
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'status') onStatus?.(data);
            else if (eventType === 'chunk') onChunk?.(data);
            else if (eventType === 'scene') onScene?.(data);
            else if (eventType === 'done') onDone?.(data);
            else if (eventType === 'error') onError?.(data);
          } catch (e) {
            // ignore
          }
          eventType = null;
        }
      }

      read();
    });
  }

  read();
}
