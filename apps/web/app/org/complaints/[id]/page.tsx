'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
type Complaint = { _id: string; category: string; description?: string; status: string; societyId: string; createdAt: string; };
type Event = { _id: string; type: string; payload?: any; createdAt: string; actorId: string };

export default function ComplaintDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [c, setC] = useState<Complaint | null>(null);
  const [evts, setEvts] = useState<Event[]>([]);
  const router = useRouter();

  async function load() {
    const list = await fetch(`/api/complaints?id=${id}`).then(r=>r.json());
    const base = Array.isArray(list) ? list.find((x: any) => x._id === id) : list;
    setC(base || null);
    const e = await fetch(`/api/complaints/${id}/events`).then(r=>r.json());
    setEvts(e);
  }
  async function setStatus(status: string) {
    await fetch(`/api/complaints/${id}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
    await load();
  }
  useEffect(() => { load(); }, [id]);

  if (!c) return <div style={{ padding: 24 }}>Loading…</div>;
  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => router.back()}>{'< Back'}</button>
      <h2>Complaint {c._id.slice(-6)}</h2>
      <p>Category: {c.category}</p>
      <p>Status: {c.status}</p>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button onClick={() => setStatus('in_progress')}>Start</button>
        <button onClick={() => setStatus('resolved')}>Resolve</button>
        <button onClick={() => setStatus('closed')}>Close</button>
      </div>
      <h3>Timeline</h3>
      <ul>{evts.map(e => (<li key={e._id}>{new Date(e.createdAt).toLocaleString()} • {e.type}</li>))}</ul>
    </div>
  );
}