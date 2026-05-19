import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function Reports() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [disciples, setDisciples] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.reports.overview(),
      api.reports.disciples(),
      api.reports.series(),
    ]).then(([o, d, s]) => {
      setOverview(o);
      setDisciples(d.disciples);
      setSeriesData(s.series);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['overview', 'disciples', 'series'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-church-600 text-church-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ReportCard label="Total Disciples" value={overview.total_disciples} />
          <ReportCard label="Total Series" value={overview.total_series} />
          <ReportCard label="Total Classes" value={overview.total_classes} />
          <ReportCard label="Tests Passed" value={overview.total_tests_passed} />
          <ReportCard label="Certificates Issued" value={overview.total_certificates} />
          <ReportCard label="Avg Completion" value={`${overview.average_completion}%`} />
        </div>
      )}

      {tab === 'disciples' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Classes</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Current Series</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {disciples.map(d => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{d.email || '-'}</td>
                  <td className="px-4 py-3 text-center">{d.classes_completed}/{d.total_classes}</td>
                  <td className="px-4 py-3 text-center">{d.average_test_score}%</td>
                  <td className="px-4 py-3 text-gray-500">{d.current_series}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(d.last_active).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {disciples.length === 0 && <p className="text-center py-8 text-gray-400">No disciples registered yet</p>}
        </div>
      )}

      {tab === 'series' && (
        <div className="space-y-4">
          {seriesData.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{s.title}</h3>
                <span className="text-sm text-gray-500">{s.total_classes} classes</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-church-600 h-2 rounded-full" style={{ width: `${s.completion_rate}%` }}></div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{s.completed_disciples}/{s.total_disciples} disciples completed</span>
                <span>{s.completion_rate}% completion rate</span>
              </div>
              {s.avg_score_per_class?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Average scores per class:</p>
                  <div className="flex flex-wrap gap-2">
                    {s.avg_score_per_class.map((a, i) => (
                      <span key={i} className="text-xs bg-gray-50 px-2 py-1 rounded">
                        {a.title}: <strong>{a.avg_score}%</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
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
