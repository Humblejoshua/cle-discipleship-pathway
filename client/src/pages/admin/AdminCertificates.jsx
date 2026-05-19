import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.certificates.list()
      .then(({ certificates }) => setCertificates(certificates))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">All Certificates</h1>

      {certificates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No certificates issued yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Disciple</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Series</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Issue Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cert.disciple_name}</td>
                  <td className="px-4 py-3 text-gray-500">{cert.series_title}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{cert.title}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(cert.issue_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <a href={api.certificates.download(cert.id)} download
                      className="text-xs bg-church-50 text-church-600 px-3 py-1.5 rounded-lg hover:bg-church-100">
                      Download PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
