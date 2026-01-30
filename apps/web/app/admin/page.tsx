'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/auth';

type Society = {
  _id: string;
  name: string;
  headUserSub: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
};

export default function AdminPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      setMessage('⚠️ Please log in to access admin panel');
      return;
    }
    fetchPendingSocieties();
  }, [isLoggedIn]);

  const fetchPendingSocieties = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setMessage('⚠️ Authentication required - Please log in first');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/societies?includePending=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        
        if (res.status === 401) {
          setMessage('⚠️ Unauthorized - Please log in first');
          return;
        }
        if (res.status === 403) {
          setMessage('⚠️ Access denied - You need platform_admin role to view this page. Please contact system administrator.');
          return;
        }
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      console.log('Fetched societies:', data);
      
      // Filter pending societies
      const pending = data.filter((s: Society) => s.status === 'pending');
      console.log('Pending societies:', pending);
      setSocieties(pending);
      
      if (pending.length === 0) {
        setMessage('ℹ️ No pending societies found. All requests have been processed.');
      }
    } catch (err: any) {
      console.error('Error fetching societies:', err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveSociety = async (id: string, name: string) => {
    if (!confirm(`Approve society "${name}"?`)) return;
    
    try {
      setMessage('');
      const token = getAccessToken();
      if (!token) {
        setMessage('⚠️ Authentication required');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/societies/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setMessage('⚠️ Unauthorized - Platform admin access required');
          return;
        }
        throw new Error(`Failed to approve: ${res.statusText}`);
      }
      
      setMessage(`✅ Society "${name}" approved successfully!`);
      fetchPendingSocieties(); // Refresh list
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const rejectSociety = async (id: string, name: string) => {
    const reason = prompt(`Reject society "${name}"? Enter reason:`);
    if (!reason) return;
    
    try {
      setMessage('');
      const token = getAccessToken();
      if (!token) {
        setMessage('⚠️ Authentication required');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/societies/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setMessage('⚠️ Unauthorized - Platform admin access required');
          return;
        }
        throw new Error(`Failed to reject: ${res.statusText}`);
      }
      
      setMessage(`✅ Society "${name}" rejected`);
      fetchPendingSocieties(); // Refresh list
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
          Platform Admin - Pending Societies
        </h1>
        <p style={{ color: '#666' }}>
          Review and approve society registration requests from society heads
        </p>
      </div>

      {message && (
        <div style={{
          padding: 16,
          marginBottom: 24,
          borderRadius: 8,
          background: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: message.startsWith('✅') ? '#155724' : '#721c24',
          border: `1px solid ${message.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18 }}>Loading...</div>
        </div>
      ) : societies.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f8f9fa',
          borderRadius: 8,
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            No Pending Societies
          </div>
          <div style={{ color: '#666' }}>
            All society registration requests have been processed
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {societies.map((society) => (
            <div
              key={society._id}
              style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
                    {society.name}
                  </h3>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    <div>Society ID: {society._id}</div>
                    <div>Head User ID: {society.headUserSub}</div>
                    <div>Requested: {new Date(society.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#fff3cd',
                  color: '#856404',
                  fontSize: 14,
                  fontWeight: 'bold',
                  border: '1px solid #ffeeba'
                }}>
                  PENDING
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => approveSociety(society._id, society.name)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#218838'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#28a745'}
                >
                  ✅ Approve Society
                </button>
                <button
                  onClick={() => rejectSociety(society._id, society.name)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#c82333'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#dc3545'}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 32,
        padding: 16,
        background: '#e7f3ff',
        borderRadius: 8,
        border: '1px solid #b8daff',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>ℹ️ What happens when you approve?</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#004085' }}>
          <li>Society status changes to "approved"</li>
          <li>Society head's membership is automatically approved</li>
          <li>Society head gets the "society_head" role</li>
          <li>Society becomes visible to residents who want to join</li>
          <li>Society head can now approve member requests</li>
        </ul>
      </div>
    </div>
  );
}
