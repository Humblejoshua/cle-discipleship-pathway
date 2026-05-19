import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function ClassList() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.series.get(seriesId),
      api.classes.list(seriesId),
    ]).then(([seriesRes, classesRes]) => {
      setSeries(seriesRes.series);
      setClasses(classesRes.classes);
    }).catch(console.error).finally(() => setLoading(false));
  }, [seriesId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return;
    try {
      await api.classes.delete(id);
      const { classes } = await api.classes.list(seriesId);
      setClasses(classes);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <button onClick={() => navigate('/admin/series')} className="text-sm text-church-600 hover:underline mb-4 inline-block">
        &larr; Back to Series
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{series?.title} — Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} class(es)</p>
        </div>
        <Link to={`/admin/series/${seriesId}/classes/new`}
          className="bg-church-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-church-700">
          + Add Class
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No classes in this series yet</div>
      ) : (
        <div className="space-y-2">
          {classes.map((cls, i) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-bold text-gray-400 w-6 text-center">{cls.order_in_series}</span>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">{cls.title}</h3>
                  <p className="text-xs text-gray-400">{cls.estimated_minutes} min {cls.is_offline_enabled ? '• Offline' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to={`/admin/tests/${cls.id}`}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                  Tests
                </Link>
                <Link to={`/admin/series/${seriesId}/classes/${cls.id}/edit`}
                  className="text-xs bg-church-50 text-church-600 px-3 py-1.5 rounded-lg hover:bg-church-100">
                  Edit
                </Link>
                <button onClick={() => handleDelete(cls.id)}
                  className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
