import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getSessionState, initStory, submitTurn, advanceStory } from '../api/client';
import StoryDisplay from '../components/StoryDisplay';
import InputPanel from '../components/InputPanel';
import BackstagePanel from '../components/BackstagePanel';

export default function StoryPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [turns, setTurns] = useState([]);
  const [streamingText, setStreamingText] = useState(''); // text being streamed right now
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [genre, setGenre] = useState('');
  const initStarted = useRef(false);

  useEffect(() => {
    getSessionState(id).then((state) => {
      setTurns(state.turns || []);
      setGenre(state.userSetup?.genre || '');
      setLoading(false);

      if (searchParams.get('init') === 'true' && state.turns.length === 0 && !initStarted.current) {
        initStarted.current = true;
        runInit();
      }
    }).catch(() => {
      setError('Session not found');
      setLoading(false);
    });
  }, [id]);

  const makeCallbacks = useCallback((pendingUserInput = null) => ({
    onStatus: (data) => setStatus(data.message || data.phase),
    onChunk: (data) => {
      setStatus(null); // hide status pill once text starts streaming
      setStreamingText((prev) => prev + data.text);
    },
    onScene: (scene) => {
      // Final structured result — replace streaming text with proper turn
      setStreamingText('');
      setTurns((prev) => {
        const turnNumber = (prev.length > 0 ? prev[prev.length - 1].turnNumber : 0) + 1;
        return [...prev, { turnNumber, output: scene, userInput: pendingUserInput }];
      });
    },
    onDone: () => {
      setGenerating(false);
      setStatus(null);
      setStreamingText('');
    },
    onError: (data) => {
      setError(data.message);
      setGenerating(false);
      setStatus(null);
      setStreamingText('');
    },
  }), []);

  const runInit = useCallback(() => {
    setGenerating(true);
    setError(null);
    setStreamingText('');
    initStory(id, makeCallbacks(null));
  }, [id, makeCallbacks]);

  const handleSubmit = useCallback((text) => {
    setGenerating(true);
    setError(null);
    setStreamingText('');
    submitTurn(id, text, makeCallbacks(text));
  }, [id, makeCallbacks]);

  const handleAdvance = useCallback(() => {
    setGenerating(true);
    setError(null);
    setStreamingText('');
    advanceStory(id, makeCallbacks(null));
  }, [id, makeCallbacks]);

  if (loading) {
    return <div style={styles.center}><span className="spinner" /></div>;
  }

  if (error && turns.length === 0 && !streamingText) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button style={styles.backBtn} onClick={() => navigate('/sessions')}>Back to Sessions</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.navBtn} onClick={() => navigate('/sessions')}>&larr;</button>
        <span style={styles.genreLabel}>{genre}</span>
        <div style={styles.topRight}>
          {generating && status && (
            <span className="status-pill">
              <span className="spinner" />
              {status}
            </span>
          )}
          <button style={styles.backstageBtn} onClick={() => setBackstageOpen(true)}>
            Backstage
          </button>
        </div>
      </div>

      {/* Story content */}
      <div style={styles.storyArea}>
        <div style={styles.storyContainer}>
          {turns.length === 0 && !streamingText && !generating ? (
            <div style={styles.empty}>
              <p style={{ color: 'var(--text-muted)' }}>Initializing your story...</p>
              <button style={styles.initBtn} onClick={runInit}>Start Story</button>
            </div>
          ) : (
            <StoryDisplay turns={turns} streamingText={streamingText} />
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button style={styles.dismissBtn} onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Input */}
      {(turns.length > 0 || streamingText) && (
        <InputPanel onSubmit={handleSubmit} onAdvance={handleAdvance} disabled={generating} />
      )}

      <BackstagePanel sessionId={id} open={backstageOpen} onClose={() => setBackstageOpen(false)} />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  topBar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--border)',
  },
  navBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, padding: '4px 8px' },
  genreLabel: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  topRight: { display: 'flex', alignItems: 'center', gap: 12 },
  backstageBtn: {
    padding: '6px 14px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text-secondary)', fontSize: 12,
  },
  storyArea: { flex: 1, paddingTop: 60 },
  storyContainer: { maxWidth: 700, margin: '0 auto', padding: '0 24px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 },
  empty: { textAlign: 'center', padding: '120px 0' },
  initBtn: { marginTop: 16, padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14 },
  backBtn: { padding: '8px 20px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 13 },
  errorBanner: {
    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    padding: '10px 20px', background: '#3a1515', border: '1px solid #5a2020',
    borderRadius: 8, color: '#e88', fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 12, zIndex: 50,
  },
  dismissBtn: { background: 'none', border: 'none', color: '#e88', fontSize: 16 },
};
