import React, { useState } from 'react';

const API_URL = '';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/login' : '/register';
      const body = mode === 'login'
        ? { username, password }
        : { username, password, email };
      const res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unknown error');
      } else {
        setSuccess(data.message || 'Success!');
        if (mode === 'login') {
          onAuth && onAuth();
        }
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-card" style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Username</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        {mode === 'register' && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: '#d9534f', marginBottom: '0.7rem' }}>{error}</div>}
        {success && <div style={{ color: '#2b6f61', marginBottom: '0.7rem' }}>{success}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}
        </button>
      </form>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button className="btn btn-ghost" onClick={() => setMode('register')}>Register</button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button className="btn btn-ghost" onClick={() => setMode('login')}>Login</button>
          </>
        )}
      </div>
    </div>
  );
}
