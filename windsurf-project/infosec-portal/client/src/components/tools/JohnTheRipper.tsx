import React, { useState } from 'react';
import api from '../../services/api';

const JohnTheRipper: React.FC = () => {
  const [hash, setHash] = useState('');
  const [wordlist, setWordlist] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const startCrack = async () => {
    if (!hash) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/john/crack', { hash, wordlist });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to start cracking job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>John the Ripper</h2>
      <p className="ll-muted">
        Provide a password hash to start a cracking job. Use only on hashes you are authorized to test.
      </p>

      <div className="ll-card ll-card--purple" style={{ marginTop: 12, maxWidth: 860 }}>
        <div className="ll-grid">
          <textarea
            className="ll-textarea"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder={`Paste hash here\n(e.g., SHA-256 or other formats depending on your john setup)`}
          />
          <input
            className="ll-input"
            value={wordlist}
            onChange={(e) => setWordlist(e.target.value)}
            placeholder="Optional wordlist path configured on server"
          />
          <div>
            <button className="ll-button" onClick={startCrack} disabled={loading || !hash}>
              {loading ? 'Starting...' : 'Start Cracking'}
            </button>
          </div>
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 10 }}>{error}</div>}
      </div>

      {result && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default JohnTheRipper;
