import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function SeriesList() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { series } = await api.series.list();
      setSeries(series);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this series and all its classes?')) return;
    try {
      await api.series.delete(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Series Management</h1>
        <Link to="/admin/series/new"
          className="bg-church-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-church-700">
          + Add Series
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No series created yet</div>
      ) : (
        <div className="space-y-3">
          {series.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-sm font-bold text-gray-400 w-6 text-center">{s.order_in_pathway}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{s.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{s.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to={`/admin/series/${s.id}/classes`}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                  Classes
                </Link>
                <Link to={`/admin/series/${s.id}/edit`}
                  className="text-xs bg-church-50 text-church-600 px-3 py-1.5 rounded-lg hover:bg-church-100">
                  Edit
                </Link>
                <button onClick={() => handleDelete(s.id)}
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
