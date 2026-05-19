import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton, CardSkeleton } from '../../components/Skeleton';

export default function Pathway() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPathway(); }, []);

  const loadPathway = async () => {
    try {
      const { pathway, totals } = await api.progress.pathway();
      setData({ pathway, totals });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Skeleton height="24px" width="60%" />
        <Skeleton height="12px" width="30%" className="mt-2" />
        <Skeleton height="12px" className="mt-4" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
  if (!data) return <div className="text-center py-12 text-gray-500">Failed to load pathway</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Discipleship Pathway</h1>
        <p className="text-gray-500 mt-1">Welcome, {user?.name}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Overall Progress</h2>
          <span className="text-lg font-bold text-church-600">{data.totals.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-church-600 h-3 rounded-full transition-all duration-500" style={{ width: `${data.totals.percentage}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">{data.totals.completed_classes} of {data.totals.total_classes} classes completed</p>
      </div>

      <div className="space-y-6">
        {data.pathway.map((series, si) => (
          <SeriesCard key={series.id} series={series} isFirst={si === 0} />
        ))}
        {data.pathway.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No series available yet. Check back later.
          </div>
        )}
      </div>
    </div>
  );
}

function SeriesCard({ series, isFirst }) {
  const [expanded, setExpanded] = useState(isFirst);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">{series.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{series.description}</p>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <div className="text-lg font-bold text-church-600">{series.percentage}%</div>
            <div className="text-xs text-gray-400">{series.completed_classes}/{series.total_classes}</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div className="bg-church-600 h-2 rounded-full transition-all duration-500" style={{ width: `${series.percentage}%` }}></div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {series.classes.map((cls, ci) => (
            <ClassItem key={cls.id} cls={cls} index={ci} seriesId={series.id} isFirst={ci === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassItem({ cls, index, seriesId, isFirst }) {
  const isLocked = cls.locked;

  const statusConfig = {
    completed: { bg: 'bg-green-50', dot: 'bg-green-500', text: 'text-green-700', label: 'Completed' },
    in_progress: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700', label: 'In Progress' },
    not_started: { bg: 'bg-gray-50', dot: 'bg-gray-300', text: 'text-gray-500', label: 'Not Started' },
    locked: { bg: 'bg-gray-100', dot: 'bg-gray-400', text: 'text-gray-400', label: 'Locked' },
  };

  const status = cls.test_passed ? 'completed' : (isLocked ? 'locked' : cls.status);
  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <div className={`px-5 py-3 border-b border-gray-100 last:border-b-0 ${config.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`}></div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>{cls.title}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              <span>{cls.estimated_minutes} min</span>
              <span className={`font-medium ${config.text}`}>{config.label}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isLocked ? (
            <span className="text-xs bg-gray-200 text-gray-400 px-3 py-1.5 rounded-lg cursor-not-allowed inline-block">
              Locked
            </span>
          ) : status === 'completed' ? (
            <Link to={`/disciple/class/${cls.id}`}
              className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Review
            </Link>
          ) : (
            <Link to={`/disciple/class/${cls.id}`}
              className="text-xs bg-church-600 text-white px-3 py-1.5 rounded-lg hover:bg-church-700">
              {status === 'not_started' ? 'Start Class' : 'Continue'}
            </Link>
          )}
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
