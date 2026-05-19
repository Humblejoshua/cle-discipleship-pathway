import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export default function DisciplesCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCerts(); }, []);

  const loadCerts = async () => {
    try {
      const { certificates } = await api.progress.certificates();
      setCertificates(certificates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton height="28px" width="200px" />
      <Skeleton height="14px" width="280px" className="mt-1" />
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-6"><Skeleton height="24px" width="70%" /><Skeleton height="14px" width="40%" className="mt-2" /></div>)}
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Certificates</h1>
        <p className="text-gray-500 mt-1">Certificates awarded for completed series</p>
      </div>

      {certificates.length === 0 ? (
        <EmptyState icon="📜" title="No Certificates Yet"
          message="Complete a full series by passing all its classes to earn a certificate." />
      ) : (
        <div className="grid gap-6">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{cert.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Christian Life Embassy Church</p>
                <p className="text-sm text-gray-400 mt-0.5">{user?.name}</p>
                <p className="text-xs text-gray-400 mt-1">Issued: {new Date(cert.issue_date).toLocaleDateString()}</p>
              </div>
              <a href={api.certificates.download(cert.id)} download
                className="flex items-center gap-2 bg-church-600 text-white px-5 py-2.5 rounded-lg hover:bg-church-700 transition-colors text-sm whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
