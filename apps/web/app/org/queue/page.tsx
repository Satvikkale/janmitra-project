'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAccessToken } from '@/lib/auth';

export default function QueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.push('/auth/login?next=/org/queue'); return; }
    apiFetch('/v1/complaints').then(setItems).catch(() => router.push('/auth/login?next=/org/queue'));
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>Org Queue</h1>
      <table border={1} cellPadding={8}>
        <thead><tr><th>ID</th><th>Category</th><th>Status</th><th>Society</th><th>Created</th></tr></thead>
        <tbody>
          {items.map(c => (
            <tr key={c._id} onClick={() => location.assign(`/org/complaints/${c._id}`)} style={{ cursor: 'pointer' }}>
              <td>{c._id.slice(-6)}</td>
              <td>{c.category}</td>
              <td>{c.status}</td>
              <td>{c.societyId}</td>
              <td>{new Date(c.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}