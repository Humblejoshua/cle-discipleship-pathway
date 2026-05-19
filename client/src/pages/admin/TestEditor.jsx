import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function TestEditor() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [seriesId, setSeriesId] = useState(null);

  useEffect(() => {
    api.classes.get(classId).then(({ class: c }) => {
      setCls(c);
      setSeriesId(c.series_id);
    });
    loadQuestions();
  }, [classId]);

  const loadQuestions = async () => {
    try {
      const { questions } = await api.tests.getQuestions(classId);
      setQuestions(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    // We'll delete via the backend
    if (!confirm('Delete this question?')) return;
    try {
      // Use direct fetch since there's no questions API endpoint yet
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tests/${classId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      loadQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <button onClick={() => navigate(`/admin/series/${seriesId}/classes`)} className="text-sm text-church-600 hover:underline mb-4 inline-block">
        &larr; Back to Classes
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Test Questions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cls?.title} — {questions.length} question(s)</p>
        </div>
        <button onClick={() => setEditingQuestion({ class_id: classId, question_text: '', is_multi_choice: false, order_in_test: questions.length + 1, options: [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }] })}
          className="bg-church-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-church-700">
          + Add Question
        </button>
      </div>

      {editingQuestion && (
        <QuestionForm
          question={editingQuestion}
          onSave={() => { setEditingQuestion(null); loadQuestions(); }}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No questions yet. Click "Add Question" to create one.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400">{q.order_in_test}.</span>
                    <span className="font-medium text-gray-800">{q.question_text}</span>
                    {q.is_multi_choice && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">Multi</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    {q.options?.map((opt, oi) => (
                      <div key={opt.id} className={`text-sm px-3 py-1 rounded ${opt.is_correct ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>
                        {String.fromCharCode(65 + oi)}. {opt.option_text} {opt.is_correct && '✓'}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingQuestion({
                    id: q.id, class_id: q.class_id, question_text: q.question_text,
                    is_multi_choice: q.is_multi_choice, order_in_test: q.order_in_test,
                    options: q.options.map(o => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
                  })}
                    className="text-xs bg-church-50 text-church-600 px-3 py-1.5 rounded-lg hover:bg-church-100">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(q.id)}
                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionForm({ question, onSave, onCancel }) {
  const [form, setForm] = useState(question);
  const [saving, setSaving] = useState(false);

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { option_text: '', is_correct: false }] });
  };

  const updateOption = (index, field, value) => {
    const opts = [...form.options];
    opts[index] = { ...opts[index], [field]: value };
    setForm({ ...form, options: opts });
  };

  const removeOption = (index) => {
    setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) { alert('Question text is required'); return; }
    const validOptions = form.options.filter(o => o.option_text.trim());
    if (validOptions.length < 2) { alert('At least 2 options required'); return; }
    if (!validOptions.some(o => o.is_correct)) { alert('Mark at least one correct answer'); return; }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const isNew = !form.id;
      const url = isNew ? `/api/tests/${form.class_id}` : `/api/tests/${form.class_id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: form.id,
          question_text: form.question_text,
          is_multi_choice: form.is_multi_choice ? 1 : 0,
          order_in_test: form.order_in_test,
          options: form.options.map(o => ({
            id: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct ? 1 : 0,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSave();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-church-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">{form.id ? 'Edit Question' : 'New Question'}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
          <textarea value={form.question_text}
            onChange={e => setForm({ ...form, question_text: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none h-20" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_multi_choice}
              onChange={e => setForm({ ...form, is_multi_choice: e.target.checked })}
              className="rounded border-gray-300 text-church-600 focus:ring-church-500" />
            <span className="text-sm text-gray-700">Multiple correct answers</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input type="number" value={form.order_in_test}
              onChange={e => setForm({ ...form, order_in_test: Number(e.target.value) })}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Options</label>
            <button type="button" onClick={addOption}
              className="text-xs text-church-600 hover:underline">+ Add Option</button>
          </div>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type={form.is_multi_choice ? 'checkbox' : 'radio'} name="correct-option"
                  checked={opt.is_correct}
                  onChange={e => {
                    const opts = form.options.map((o, idx) => ({
                      ...o,
                      is_correct: form.is_multi_choice ? (idx === i ? e.target.checked : o.is_correct) : (idx === i),
                    }));
                    setForm({ ...form, options: opts });
                  }}
                  className="text-church-600 focus:ring-church-500" />
                <input type="text" value={opt.option_text}
                  onChange={e => updateOption(i, 'option_text', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-church-500 outline-none text-sm"
                  placeholder={`Option ${i + 1}`} />
                <button onClick={() => removeOption(i)}
                  className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Check the box next to the correct answer(s)</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleSave} disabled={saving}
            className="bg-church-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-church-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Question'}
          </button>
          <button type="button" onClick={onCancel}
            className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
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
