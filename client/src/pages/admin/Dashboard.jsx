import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import BarChart from '../../components/BarChart';
import EmptyState from '../../components/EmptyState';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.reports.overview(),
      api.reports.series(),
    ]).then(([o, s]) => {
      setOverview(o);
      setSeriesData(s.series || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const chartData = seriesData?.map(s => ({
    label: s.title.length > 12 ? s.title.substring(0, 12) + '...' : s.title,
    value: s.completion_rate || 0,
  })) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <DashboardCard label="Disciples" value={overview.total_disciples} icon="👥" />
          <DashboardCard label="Series" value={overview.total_series} icon="📚" />
          <DashboardCard label="Classes" value={overview.total_classes} icon="📖" />
          <DashboardCard label="Tests Passed" value={overview.total_tests_passed} icon="✅" />
          <DashboardCard label="Certificates" value={overview.total_certificates} icon="🎓" />
          <DashboardCard label="Avg Completion" value={`${overview.average_completion || 0}%`} icon="📊" />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mb-8">
          <BarChart data={chartData} title="Series Completion Rates (%)" height={180} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink to="/admin/series" title="Manage Series" desc="Create and edit discipleship series" icon="📚" />
        <QuickLink to="/admin/reports" title="View Reports" desc="Track disciple progress and scores" icon="📊" />
        <QuickLink to="/admin/certificates" title="Certificates" desc="View all issued certificates" icon="🎓" />
      </div>
    </div>
  );
}

function DashboardCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-sm transition-shadow">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function QuickLink({ to, title, desc, icon }) {
  return (
    <Link to={to} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
      <span className="text-3xl block mb-3">{icon}</span>
      <h3 className="font-semibold text-gray-800 group-hover:text-church-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </Link>
  );
}

function LoadingSpinner() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48"></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4"><div className="h-8 bg-gray-200 rounded w-12 mx-auto"></div><div className="h-3 bg-gray-200 rounded w-16 mx-auto mt-2"></div></div>)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="h-5 bg-gray-200 rounded w-48 mb-4"></div><div className="h-44 bg-gray-200 rounded"></div></div>
    </div>
  );
}
