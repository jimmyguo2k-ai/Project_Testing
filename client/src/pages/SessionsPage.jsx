import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, deleteSession } from '../api/client';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this story session?')) return;
    await deleteSession(id);
    setSessions((s) => s.filter((x) => x.sessionId !== id));
  };

  return (
    <div className="page" style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Story Generator</h1>
          <p style={styles.subtitle}>Three-Layer AI Narrative Engine</p>
        </div>

        <button style={styles.newBtn} onClick={() => navigate('/setup')}>
          + New Story
        </button>

        {loading ? (
          <div style={styles.center}><span className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: 'var(--text-muted)' }}>No stories yet. Create your first one.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                style={styles.card}
                onClick={() => navigate(`/story/${s.sessionId}`)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={styles.cardTop}>
                  <span style={styles.genre}>{s.genre}</span>
                  <span style={styles.turns}>Turn {s.currentTurnNumber}</span>
                </div>
                <p style={styles.world}>{s.world || 'Untitled world'}</p>
                <div style={styles.cardBottom}>
                  <span style={styles.date}>{new Date(s.updatedAt).toLocaleDateString()}</span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => handleDelete(s.sessionId, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: '60px 24px' },
  container: { maxWidth: 600, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 300, letterSpacing: '0.05em', color: 'var(--text-primary)' },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', marginTop: 8 },
  newBtn: {
    display: 'block', width: '100%', padding: '14px', marginBottom: 32,
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 500, transition: 'opacity 0.2s',
  },
  center: { textAlign: 'center', padding: 40 },
  empty: { textAlign: 'center', padding: 60 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    padding: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  genre: { fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  turns: { fontSize: 12, color: 'var(--text-muted)' },
  world: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  date: { fontSize: 12, color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12,
    cursor: 'pointer', padding: '4px 8px',
  },
};
