import { useRef, useEffect } from 'react';

export default function StoryDisplay({ turns, streamingText }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length, streamingText]);

  return (
    <div style={styles.container}>
      {turns.map((turn) => (
        <div key={turn.turnNumber} style={styles.turn}>
          {turn.userInput && (
            <div style={styles.userAction}>
              <span style={styles.userLabel}>You</span>
              <p style={styles.userText}>{turn.userInput}</p>
            </div>
          )}
          {turn.output?.prose && (
            <div style={styles.prose}>
              {turn.output.prose.split('\n').filter(p => p.trim()).map((paragraph, j) => (
                <p key={j} style={styles.paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
          {turn.output?.interactionHook?.mode === 'explicit' && turn.output.interactionHook.prompt && (
            <div style={styles.hookArea}>
              <p style={styles.hookPrompt}>{turn.output.interactionHook.prompt}</p>
              {turn.output.interactionHook.suggestedActions?.length > 0 && (
                <div style={styles.suggestions}>
                  {turn.output.interactionHook.suggestedActions.map((action, k) => (
                    <span key={k} style={styles.suggestion}>{action}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Live streaming text */}
      {streamingText && (
        <div style={styles.turn}>
          <div style={styles.prose}>
            {streamingText.split('\n').filter(p => p.trim()).map((paragraph, j) => (
              <p key={j} style={styles.paragraph}>{paragraph}</p>
            ))}
            <span style={styles.cursor}>▋</span>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}

const styles = {
  container: { padding: '40px 0 120px' },
  turn: { marginBottom: 48, animation: 'fadeIn 0.4s ease' },
  userAction: { marginBottom: 24, paddingLeft: 16, borderLeft: '2px solid var(--accent-dim)' },
  userLabel: { fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  userText: { fontSize: 15, color: 'var(--text-primary)', marginTop: 4, fontStyle: 'italic' },
  prose: { fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.85, color: 'var(--text-primary)' },
  paragraph: { marginBottom: 18 },
  hookArea: { marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' },
  hookPrompt: { fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  suggestion: {
    padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    borderRadius: 20, fontSize: 13, color: 'var(--text-secondary)',
  },
  cursor: { animation: 'blink 1s step-end infinite', color: 'var(--accent)', fontSize: 14 },
};
