import { Link } from 'react-router-dom';

const steps = [
  { icon: '🔑', title: 'Step 1 – Sign In', desc: 'Open the web app and click "Sign In" or "Sign Up" to create your account.' },
  { icon: '🗺️', title: 'Step 2 – See Your Pathway', desc: 'After login, you land on "My Discipleship Pathway" showing all your series and progress.' },
  { icon: '📖', title: 'Step 3 – Learn a Class', desc: 'Click a class to read the lesson text, watch the video, and download the PDF. Click "Mark as Read" when done.' },
  { icon: '✍️', title: 'Step 4 – Take the Test', desc: 'Answer multiple-choice questions about the lesson. Submit to see your score and feedback instantly.' },
  { icon: '🏆', title: 'Step 5 – Track Progress', desc: 'Visit "Milestones" and "Certificates" pages to see your achievements and download completion certificates.' },
];

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">How to Use CLE Discipleship Pathway</h1>
        <p className="text-gray-500 mt-1">Your guide to navigating the platform</p>
      </div>

      <div className="space-y-4 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">{step.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-800">{step.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-church-50 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-church-800 mb-2">Ready to begin?</h3>
        <Link to="/disciple/pathway"
          className="inline-block bg-church-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-church-700 transition-colors">
          Go to My Pathway
        </Link>
      </div>
    </div>
  );
}
