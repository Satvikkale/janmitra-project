
"use client";
import { useState } from 'react';

export default function SocietyOnboarding() {
  const [name, setName] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/societies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, headEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to onboard society');
      setMessage(`Society created! ID: ${data._id}`);
      setName('');
      setHeadEmail('');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
      <h2>Society Onboarding</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="society-name">Society Name</label>
        <input id="society-name" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', marginBottom: 12, padding: 8 }} />
        <label htmlFor="head-email">Head Email</label>
        <input id="head-email" value={headEmail} onChange={e => setHeadEmail(e.target.value)} required style={{ width: '100%', marginBottom: 12, padding: 8 }} />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 4 }}>
          {loading ? 'Creating...' : 'Create Society'}
        </button>
      </form>
      {message && <div style={{ marginTop: 16, color: message.startsWith('Society created') ? 'green' : 'red' }}>{message}</div>}
    </div>
  );
}
