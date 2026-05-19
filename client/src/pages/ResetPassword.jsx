import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await api.auth.resetPassword(token, password);
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-church-600 to-church-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">CLE Discipleship Pathway</h1>
          <p className="text-blue-200 mt-2">Christian Life Embassy Church</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Set New Password</h2>
          {message && (
            <div>
              <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>
              <Link to="/login" className="block text-center text-church-600 font-semibold hover:underline">Go to Sign In</Link>
            </div>
          )}
          {!message && (
            <>
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
              {!token && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">Invalid reset link. No token provided.</div>}
              {token && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 focus:border-transparent outline-none"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" required value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 focus:border-transparent outline-none"
                      placeholder="Repeat your password"
                    />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-church-600 text-white py-2.5 rounded-lg font-semibold hover:bg-church-700 transition-colors disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
              <p className="text-center mt-6 text-sm text-gray-600">
                <Link to="/login" className="text-church-600 font-semibold hover:underline">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
