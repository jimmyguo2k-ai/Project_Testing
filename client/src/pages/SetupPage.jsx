import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, initStory } from '../api/client';

export default function SetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    genre: '',
    world: '',
    tone: '',
    protagonistName: '',
    protagonistDescription: '',
    supportingCharacters: [{ name: '', description: '' }],
    additionalNotes: '',
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateChar = (index, field, value) => {
    const chars = [...form.supportingCharacters];
    chars[index] = { ...chars[index], [field]: value };
    setForm((f) => ({ ...f, supportingCharacters: chars }));
  };

  const addChar = () => {
    setForm((f) => ({
      ...f,
      supportingCharacters: [...f.supportingCharacters, { name: '', description: '' }],
    }));
  };

  const removeChar = (index) => {
    setForm((f) => ({
      ...f,
      supportingCharacters: f.supportingCharacters.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.genre || !form.world || !form.protagonistName) return;
    setLoading(true);

    // Filter out empty supporting characters
    const setup = {
      ...form,
      supportingCharacters: form.supportingCharacters.filter((c) => c.name.trim()),
    };

    const { sessionId } = await createSession(setup);
    navigate(`/story/${sessionId}?init=true`);
  };

  return (
    <div className="page" style={styles.page}>
      <div style={styles.container}>
        <button style={styles.back} onClick={() => navigate('/sessions')}>
          &larr; Back
        </button>

        <h1 style={styles.title}>Create Your Story</h1>
        <p style={styles.subtitle}>Define the world and characters. The screenwriter will build the rest.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <label style={styles.label}>Genre *</label>
            <input
              style={styles.input}
              placeholder="e.g., dark fantasy, sci-fi noir, psychological thriller..."
              value={form.genre}
              onChange={(e) => update('genre', e.target.value)}
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>World Setting *</label>
            <textarea
              style={{ ...styles.input, ...styles.textarea }}
              placeholder="Describe the world your story takes place in. The more specific and unique, the better..."
              value={form.world}
              onChange={(e) => update('world', e.target.value)}
              rows={4}
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Tone</label>
            <input
              style={styles.input}
              placeholder="e.g., melancholic with dark humor, tense and paranoid..."
              value={form.tone}
              onChange={(e) => update('tone', e.target.value)}
            />
          </div>

          <hr style={styles.divider} />

          <div style={styles.section}>
            <label style={styles.label}>Protagonist Name *</label>
            <input
              style={styles.input}
              placeholder="Your character's name"
              value={form.protagonistName}
              onChange={(e) => update('protagonistName', e.target.value)}
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Protagonist Description</label>
            <textarea
              style={{ ...styles.input, ...styles.textarea }}
              placeholder="Who is your character? Background, personality, what drives them..."
              value={form.protagonistDescription}
              onChange={(e) => update('protagonistDescription', e.target.value)}
              rows={3}
            />
          </div>

          <hr style={styles.divider} />

          <div style={styles.section}>
            <label style={styles.label}>Supporting Characters</label>
            {form.supportingCharacters.map((char, i) => (
              <div key={i} style={styles.charRow}>
                <input
                  style={{ ...styles.input, flex: '0 0 140px' }}
                  placeholder="Name"
                  value={char.name}
                  onChange={(e) => updateChar(i, 'name', e.target.value)}
                />
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="Brief description"
                  value={char.description}
                  onChange={(e) => updateChar(i, 'description', e.target.value)}
                />
                {form.supportingCharacters.length > 1 && (
                  <button type="button" style={styles.removeBtn} onClick={() => removeChar(i)}>
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button type="button" style={styles.addBtn} onClick={addChar}>
              + Add Character
            </button>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              style={{ ...styles.input, ...styles.textarea }}
              placeholder="Any other details: themes you want to explore, things to avoid, specific scenarios..."
              value={form.additionalNotes}
              onChange={(e) => update('additionalNotes', e.target.value)}
              rows={3}
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? <><span className="spinner" /> Creating...</> : 'Begin Story'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: '40px 24px 80px' },
  container: { maxWidth: 600, margin: '0 auto' },
  back: {
    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14,
    marginBottom: 24, padding: 0,
  },
  title: { fontSize: 24, fontWeight: 300, marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 0 },
  section: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.03em' },
  input: {
    width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
  },
  textarea: { resize: 'vertical', lineHeight: 1.6 },
  divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0 20px' },
  charRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  removeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18,
    padding: '0 4px', lineHeight: 1,
  },
  addBtn: {
    background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
    color: 'var(--text-muted)', fontSize: 13, padding: '8px 14px', width: '100%',
  },
  submitBtn: {
    marginTop: 12, padding: '14px', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
};
