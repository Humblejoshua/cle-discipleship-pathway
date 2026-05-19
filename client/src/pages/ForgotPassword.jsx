import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [login, setLogin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(login);
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your email or phone number to receive a reset link.</p>
          {message && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>}
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
              <input type="text" required value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 focus:border-transparent outline-none"
                placeholder="you@example.com or +1234567890"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-church-600 text-white py-2.5 rounded-lg font-semibold hover:bg-church-700 transition-colors disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-600">
            <Link to="/login" className="text-church-600 font-semibold hover:underline">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
