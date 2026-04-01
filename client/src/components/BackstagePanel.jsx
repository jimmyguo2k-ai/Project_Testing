import { useState, useEffect } from 'react';
import { getBible, getDirectives, getTurns, getStats } from '../api/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TABS = ['Story Bible', 'Director Log', 'Actor Log', 'System'];

export default function BackstagePanel({ sessionId, open, onClose }) {
  const [tab, setTab] = useState(0);
  const [bible, setBible] = useState(null);
  const [directives, setDirectives] = useState([]);
  const [turns, setTurns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true);
    Promise.all([
      getBible(sessionId),
      getDirectives(sessionId),
      getTurns(sessionId),
      getStats(sessionId),
    ]).then(([b, d, t, s]) => {
      setBible(b);
      setDirectives(d);
      setTurns(t);
      setStats(s);
      setLoading(false);
    });
  }, [open, sessionId]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Backstage</h2>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.tabs}>
          {TABS.map((name, i) => (
            <button
              key={i}
              style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
              onClick={() => setTab(i)}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.center}><span className="spinner" /></div>
          ) : (
            <>
              {tab === 0 && <BibleTab bible={bible} />}
              {tab === 1 && <DirectorTab directives={directives} />}
              {tab === 2 && <ActorTab turns={turns} />}
              {tab === 3 && <SystemTab stats={stats} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BibleTab({ bible }) {
  if (!bible || bible.version === 0) return <p style={styles.muted}>Bible not yet generated.</p>;

  return (
    <div style={styles.scrollArea}>
      <Section title="Themes">
        {bible.themes?.map((t) => (
          <div key={t.id} style={styles.card}>
            <strong>{t.name}</strong>
            <p style={styles.cardText}>{t.description}</p>
          </div>
        ))}
      </Section>

      <Section title="Characters">
        {bible.characters?.map((c) => (
          <div key={c.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>{c.name}</strong>
              <span style={styles.badge}>{c.role}</span>
            </div>
            <Field label="Motivation" value={c.motivation} />
            <Field label="Voice" value={c.voice} />
            <Field label="Arc" value={c.arc} />
            <Field label="Contradiction" value={c.contradiction} />
            {c.secrets?.length > 0 && (
              <Field label="Secrets" value={c.secrets.join('; ')} />
            )}
          </div>
        ))}
      </Section>

      <Section title="Relationships">
        {bible.relationships?.map((r, i) => (
          <div key={i} style={styles.card}>
            <strong>{r.characters?.join(' & ')}</strong>
            <Field label="Type" value={r.type} />
            <Field label="Tension" value={r.tension} />
            <Field label="Evolution" value={r.evolution} />
          </div>
        ))}
      </Section>

      <Section title="Conflict Library">
        {bible.conflictLibrary?.map((c) => (
          <div key={c.id} style={{ ...styles.card, opacity: c.used ? 0.5 : 1 }}>
            <div style={styles.cardHeader}>
              <span style={styles.badge}>{c.type}</span>
              <span style={styles.badge}>{c.severity}</span>
              {c.used && <span style={{ ...styles.badge, background: 'var(--text-muted)' }}>USED</span>}
            </div>
            <p style={styles.cardText}>{c.description}</p>
          </div>
        ))}
      </Section>

      <Section title="Plot Boundaries">
        <Field label="Acts" value={`${bible.plotBoundaries?.currentAct} / ${bible.plotBoundaries?.acts}`} />
        <Field label="Forbidden" value={bible.plotBoundaries?.forbiddenDirections?.join('; ')} />
        {bible.plotBoundaries?.mandatoryDestinations && (
          <Field label="Must Reach" value={bible.plotBoundaries.mandatoryDestinations.join('; ')} />
        )}
      </Section>

      <Section title="Aesthetic Direction">
        <Field label="Prose" value={bible.aestheticDirection?.proseStyle} />
        <Field label="Dialogue" value={bible.aestheticDirection?.dialogueStyle} />
        <Field label="POV" value={bible.aestheticDirection?.narrativePOV} />
      </Section>
    </div>
  );
}

function DirectorTab({ directives }) {
  if (directives.length === 0) return <p style={styles.muted}>No directives yet.</p>;

  const tensionData = directives.map((d) => ({
    turn: d.turnNumber,
    tension: d.directive?.pacingInstruction?.currentTension || 0,
    target: d.directive?.pacingInstruction?.targetTension || 0,
  }));

  return (
    <div style={styles.scrollArea}>
      <Section title="Tension Curve">
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={tensionData}>
              <XAxis dataKey="turn" stroke="#666" fontSize={11} />
              <YAxis domain={[0, 1]} stroke="#666" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 6, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="tension" stroke="#7c6fea" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="target" stroke="#5a5" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Directive Timeline">
        {[...directives].reverse().map((d) => (
          <div key={d.turnNumber} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>Turn {d.turnNumber}</strong>
              <span style={styles.badge}>
                {d.directive?.pacingInstruction?.pacingAction || '?'}
              </span>
              <span style={styles.badge}>
                T: {d.directive?.pacingInstruction?.currentTension?.toFixed(2)}
              </span>
            </div>
            {d.userInput && <Field label="User Input" value={d.userInput} />}
            <Field label="Scene" value={`${d.directive?.sceneControl?.location || '?'} — ${d.directive?.sceneControl?.mood || '?'}`} />
            <Field label="Hook Mode" value={d.directive?.hookMode} />
            {d.directive?.userResponseGuidance?.integrationNote && (
              <Field label="User Integration" value={d.directive.userResponseGuidance.integrationNote} />
            )}
            {d.directive?.narrativeDirectives?.map((nd, i) => (
              <Field key={i} label={nd.type} value={nd.instruction || nd.description} />
            ))}
          </div>
        ))}
      </Section>
    </div>
  );
}

function ActorTab({ turns }) {
  if (turns.length === 0) return <p style={styles.muted}>No turns yet.</p>;

  return (
    <div style={styles.scrollArea}>
      {[...turns].reverse().map((t) => (
        <div key={t.turnNumber} style={styles.card}>
          <div style={styles.cardHeader}>
            <strong>Turn {t.turnNumber}</strong>
            <span style={styles.badge}>{t.output?.metadata?.wordCount || '?'} words</span>
            <span style={styles.badge}>{t.output?.metadata?.dominantMood || '?'}</span>
          </div>
          <Field label="Characters Present" value={t.output?.metadata?.charactersPresent?.join(', ')} />
          <Field label="Hook Mode" value={t.output?.interactionHook?.mode} />
          {t.output?.interactionHook?.prompt && (
            <Field label="Hook" value={t.output.interactionHook.prompt} />
          )}
          {t.output?.segments && (
            <div style={{ marginTop: 8 }}>
              <span style={styles.fieldLabel}>Segments:</span>
              <div style={styles.segments}>
                {t.output.segments.map((s, i) => (
                  <span key={i} style={{
                    ...styles.segBadge,
                    background: s.type === 'dialogue' ? '#2a2040' : '#1a2020',
                  }}>
                    {s.type}{s.characterId ? ` (${s.characterId})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SystemTab({ stats }) {
  if (!stats) return <p style={styles.muted}>No stats available.</p>;

  const { tokenUsage, currentTurnNumber, bibleVersion, lastBibleRefreshTurn, summaries } = stats;

  return (
    <div style={styles.scrollArea}>
      <Section title="Overview">
        <Field label="Current Turn" value={currentTurnNumber} />
        <Field label="Bible Version" value={bibleVersion} />
        <Field label="Last Bible Refresh" value={`Turn ${lastBibleRefreshTurn}`} />
      </Section>

      <Section title="Total Token Usage">
        <Field label="Input Tokens" value={tokenUsage?.total?.input?.toLocaleString()} />
        <Field label="Output Tokens" value={tokenUsage?.total?.output?.toLocaleString()} />
      </Section>

      <Section title="Usage by Agent">
        {Object.entries(tokenUsage?.byAgent || {}).map(([agent, data]) => (
          <div key={agent} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>{agent}</strong>
              <span style={styles.badge}>{data.calls} calls</span>
            </div>
            <Field label="Input" value={data.input?.toLocaleString()} />
            <Field label="Output" value={data.output?.toLocaleString()} />
          </div>
        ))}
      </Section>

      {tokenUsage?.byTurn?.length > 0 && (
        <Section title="Per-Turn Token Usage">
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={tokenUsage.byTurn}>
                <XAxis dataKey="turnNumber" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 6, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="totalInput" stroke="#7c6fea" strokeWidth={2} name="Input" />
                <Line type="monotone" dataKey="totalOutput" stroke="#5a5" strokeWidth={2} name="Output" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {summaries?.length > 0 && (
        <Section title="History Summaries">
          {summaries.map((s, i) => (
            <div key={i} style={styles.card}>
              <strong>Turns {s.coversTurns[0]}-{s.coversTurns[1]}</strong>
              <p style={styles.cardText}>{s.summary}</p>
              {s.keyEvents?.map((e, j) => (
                <span key={j} style={styles.badge}>{e}</span>
              ))}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// Shared sub-components
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}:</span>
      <span style={styles.fieldValue}>{value}</span>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    width: '480px', maxWidth: '90vw', height: '100vh',
    background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
  },
  title: { fontSize: 16, fontWeight: 500 },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: 24, lineHeight: 1, padding: 0,
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid var(--border)',
    padding: '0 12px',
  },
  tab: {
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    color: 'var(--text-muted)', fontSize: 12, padding: '10px 12px',
    cursor: 'pointer', transition: 'color 0.2s',
  },
  tabActive: {
    color: 'var(--accent)', borderBottomColor: 'var(--accent)',
  },
  content: {
    flex: 1, overflow: 'hidden',
  },
  scrollArea: {
    height: '100%', overflowY: 'auto', padding: '16px 20px',
  },
  center: { textAlign: 'center', padding: 40 },
  muted: { color: 'var(--text-muted)', textAlign: 'center', padding: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 12,
  },
  card: {
    padding: 14, background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    borderRadius: 6, marginBottom: 8,
  },
  cardHeader: {
    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6,
  },
  cardText: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 },
  badge: {
    display: 'inline-block', padding: '2px 8px', background: 'var(--bg-hover)',
    borderRadius: 10, fontSize: 11, color: 'var(--text-muted)',
  },
  field: { fontSize: 13, marginTop: 4, lineHeight: 1.5 },
  fieldLabel: { color: 'var(--text-muted)', marginRight: 6 },
  fieldValue: { color: 'var(--text-secondary)' },
  segments: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  segBadge: {
    padding: '2px 8px', borderRadius: 4, fontSize: 11, color: 'var(--text-secondary)',
  },
};
