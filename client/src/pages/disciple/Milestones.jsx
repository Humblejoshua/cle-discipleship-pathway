import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export default function Milestones() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.progress.milestones(),
      api.progress.stats(),
    ]).then(([milestonesRes, statsRes]) => {
      setData({ milestones: milestonesRes.milestones, stats: statsRes });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton height="28px" width="200px" />
      <Skeleton height="14px" width="300px" className="mt-1" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4"><Skeleton height="32px" width="50%" className="mx-auto" /><Skeleton height="12px" width="60%" className="mx-auto mt-2" /></div>)}
      </div>
    </div>
  );
  if (!data) return <div className="text-center py-12 text-gray-500">Failed to load</div>;

  const { milestones, stats } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Milestones</h1>
        <p className="text-gray-500 mt-1">Track your achievements on the discipleship journey</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Classes Done" value={stats.completed_classes} icon="📚" />
        <StatCard label="Progress" value={`${stats.percentage}%`} icon="📊" />
        <StatCard label="Avg Score" value={`${stats.average_score}%`} icon="🎯" />
        <StatCard label="Certificates" value={stats.certificates_count} icon="🏆" />
      </div>

      {milestones.length === 0 ? (
        <EmptyState icon="🌟" title="No Milestones Yet"
          message="Complete classes to unlock achievements and milestones on your discipleship journey." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {milestones.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
              <span className="text-3xl flex-shrink-0">{m.badge_icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800">{m.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Achieved {new Date(m.achieved_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
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
