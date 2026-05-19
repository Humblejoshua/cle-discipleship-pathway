import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function SeriesForm() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!seriesId;
  const [form, setForm] = useState({ title: '', description: '', order_in_pathway: 0 });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.series.get(seriesId).then(({ series }) => {
        setForm({ title: series.title, description: series.description, order_in_pathway: series.order_in_pathway });
      }).finally(() => setLoading(false));
    }
  }, [seriesId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.series.update(seriesId, form);
      } else {
        await api.series.create(form);
      }
      navigate('/admin/series');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit Series' : 'Add Series'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" required value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none h-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order in Pathway</label>
          <input type="number" value={form.order_in_pathway}
            onChange={e => setForm({ ...form, order_in_pathway: Number(e.target.value) })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-church-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-church-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate('/admin/series')}
            className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-church-600"></div>
    </div>
  );
}
