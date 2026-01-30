'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API, setTokens } from '@/lib/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // or phone, we support either
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e:any) => {
    e.preventDefault();
    setErr(null);
    try {
      const r = await fetch(`${API}/v1/auth/register`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined, password })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Register failed');
      setTokens(j.accessToken, j.refreshToken);
      router.push('/org/queue');
    } catch (e:any) { setErr(e.message); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
      <form onSubmit={submit} style={{ width:360, border:'1px solid #ddd', padding:24, borderRadius:8 }}>
        <h2>Create account</h2>
        <input placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} style={{ width:'100%', padding:10, margin:'8px 0' }} />
        <input placeholder="Email (or leave blank)" value={email} onChange={(e)=>setEmail(e.target.value)} style={{ width:'100%', padding:10, margin:'8px 0' }} />
        <input placeholder="Phone (or leave blank)" value={phone} onChange={(e)=>setPhone(e.target.value)} style={{ width:'100%', padding:10, margin:'8px 0' }} />
        <input placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={{ width:'100%', padding:10, margin:'8px 0' }} />
        {err && <div style={{ color:'#b00', marginBottom:8 }}>{err}</div>}
        <button type="submit" style={{ width:'100%', padding:12 }}>Register</button>
        <div style={{ marginTop:12 }}>
          <a href="/auth/login">Back to login</a>
        </div>
      </form>
    </div>
  );
}