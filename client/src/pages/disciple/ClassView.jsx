import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';
import { cacheClassForOffline } from '../../swRegister';

export default function ClassView() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  useEffect(() => { loadData(); }, [classId]);

  const loadData = async () => {
    try {
      const [classRes, testRes] = await Promise.all([
        api.classes.get(classId),
        api.tests.getStatus(classId),
      ]);
      const clsData = classRes.class;
      setCls(clsData);
      setTestStatus(testRes);
      setMarked(clsData.status === 'in_progress' || clsData.status === 'completed');
      if (clsData.is_offline_enabled) {
        cacheClassForOffline(classId, clsData.content_text, clsData.pdf_file_path);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async () => {
    setMarking(true);
    try {
      await api.progress.markRead(classId);
      setMarked(true);
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <LockedMessage message={error} />;
  if (!cls) return <div className="text-center py-12 text-gray-500">Class not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/disciple/pathway" className="text-sm text-church-600 hover:underline mb-4 inline-block">&larr; Back to Pathway</Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">{cls.title}</h1>
      {cls.description && <p className="text-gray-500 mb-6">{cls.description}</p>}

      {cls.video_url && (
        <div className="aspect-video mb-6 bg-black rounded-xl overflow-hidden">
          <iframe src={cls.video_url} className="w-full h-full" allowFullScreen title="Lesson video"></iframe>
        </div>
      )}

      <div className="prose mb-8" dangerouslySetInnerHTML={{ __html: cls.content_text }} />

      {cls.pdf_file_path && (
        <div className="mb-8">
          <a href={cls.pdf_file_path} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-church-50 text-church-700 px-4 py-2.5 rounded-lg hover:bg-church-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
        {!marked ? (
          <button onClick={handleMarkRead} disabled={marking}
            className="bg-church-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-church-700 transition-colors disabled:opacity-50">
            {marking ? 'Marking...' : "I've Read This"}
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {testStatus && !testStatus.is_passed && testStatus.attempts < testStatus.max_attempts && (
              <Link to={`/disciple/test/${classId}`}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center">
                {testStatus.has_taken ? 'Retake Test' : 'Take Test'}
              </Link>
            )}
            {testStatus?.is_passed && (
              <Link to={`/disciple/test/${classId}`}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center">
                Review Test
              </Link>
            )}
            <button onClick={handleMarkRead} disabled
              className="bg-gray-100 text-gray-400 px-6 py-3 rounded-lg font-semibold cursor-default">
              Marked as Read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedMessage({ message }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">Class Locked</h2>
      <p className="text-gray-500 mb-6">{message}</p>
      <Link to="/disciple/pathway" className="bg-church-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-church-700 inline-block">
        Back to Pathway
      </Link>
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
