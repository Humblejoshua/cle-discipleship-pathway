import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function ClassForm() {
  const { seriesId, classId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!classId;
  const [form, setForm] = useState({
    series_id: seriesId, title: '', description: '', content_text: '',
    video_url: '', estimated_minutes: 15, order_in_series: 0,
    is_offline_enabled: false, is_published: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (isEdit) {
      api.classes.get(classId).then(({ class: cls }) => {
        setForm({
          series_id: cls.series_id, title: cls.title, description: cls.description || '',
          content_text: cls.content_text || '', video_url: cls.video_url || '',
          estimated_minutes: cls.estimated_minutes, order_in_series: cls.order_in_series,
          is_offline_enabled: !!cls.is_offline_enabled, is_published: !!cls.is_published,
        });
      }).finally(() => setLoading(false));
    }
  }, [classId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('series_id', form.series_id);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('content_text', form.content_text);
      fd.append('video_url', form.video_url);
      fd.append('estimated_minutes', String(form.estimated_minutes));
      fd.append('order_in_series', String(form.order_in_series));
      fd.append('is_offline_enabled', form.is_offline_enabled ? '1' : '0');
      fd.append('is_published', form.is_published ? '1' : '0');
      if (pdfFile) fd.append('pdf', pdfFile);

      if (isEdit) {
        await api.classes.update(classId, fd);
      } else {
        await api.classes.create(fd);
      }
      navigate(`/admin/series/${seriesId}/classes`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit Class' : 'Add Class'}</h1>
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
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none h-20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
          <textarea value={form.content_text}
            onChange={e => setForm({ ...form, content_text: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none font-mono text-sm h-40"
            placeholder="<h2>Lesson Title</h2><p>Lesson content...</p>" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube embed)</label>
          <input type="url" value={form.video_url}
            onChange={e => setForm({ ...form, video_url: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none"
            placeholder="https://www.youtube.com/embed/..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
          <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-church-50 file:text-church-700 hover:file:bg-church-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Est. Minutes</label>
            <input type="number" value={form.estimated_minutes}
              onChange={e => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order in Series</label>
            <input type="number" value={form.order_in_series}
              onChange={e => setForm({ ...form, order_in_series: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_offline_enabled}
              onChange={e => setForm({ ...form, is_offline_enabled: e.target.checked })}
              className="rounded border-gray-300 text-church-600 focus:ring-church-500" />
            <span className="text-sm text-gray-700">Enable Offline</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_published}
              onChange={e => setForm({ ...form, is_published: e.target.checked })}
              className="rounded border-gray-300 text-church-600 focus:ring-church-500" />
            <span className="text-sm text-gray-700">Published</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-church-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-church-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate(`/admin/series/${seriesId}/classes`)}
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
