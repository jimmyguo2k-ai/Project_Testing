import { useState } from 'react';

export default function InputPanel({ onSubmit, onAdvance, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          placeholder={disabled ? 'Story is generating...' : 'What do you do? (or press Continue)'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <div style={styles.buttons}>
          <button type="submit" style={styles.submitBtn} disabled={disabled || !text.trim()}>
            Act
          </button>
          <button
            type="button"
            style={styles.advanceBtn}
            onClick={onAdvance}
            disabled={disabled}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, var(--bg-primary) 20%)',
    padding: '40px 24px 24px',
  },
  form: {
    maxWidth: 700,
    margin: '0 auto',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
  },
  buttons: {
    display: 'flex',
    gap: 6,
  },
  submitBtn: {
    padding: '12px 20px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  advanceBtn: {
    padding: '12px 16px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
  },
};
