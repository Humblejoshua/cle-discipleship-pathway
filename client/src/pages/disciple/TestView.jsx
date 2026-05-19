import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api';
import { cacheQuestionsForOffline } from '../../swRegister';

export default function TestView() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  const handleSubmit = useCallback(async (isAuto) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isAuto && !confirm('Submit your answers?')) {
      submittedRef.current = false;
      return;
    }
    setSubmitting(true);
    try {
      const formattedAnswers = questions.map(q => answers[q.id] || null);
      const res = await api.tests.submit(classId, formattedAnswers);
      setResult(res);
    } catch (err) {
      alert(err.message);
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [questions, answers, classId]);

  useEffect(() => {
    Promise.all([
      api.tests.getQuestions(classId),
      api.tests.getResult(classId),
    ]).then(([qRes, rRes]) => {
      setQuestions(qRes.questions);
      cacheQuestionsForOffline(classId, qRes.questions);
      if (rRes.result?.is_passed) {
        setResult(rRes.result);
      } else if (qRes.questions.length > 0) {
        const totalSec = (qRes.timer_minutes || 5) * 60;
        setTimeLeft(totalSec);
      }
    }).catch((err) => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, result, handleSubmit]);

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Test Locked</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/disciple/pathway" className="bg-church-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-church-700 inline-block">
          Back to Pathway
        </Link>
      </div>
    );
  }

  const handleAnswer = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentQ(0);
    submittedRef.current = false;
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner />;

  if (result) {
    return <ResultScreen result={result} questions={questions} classId={classId} onRetake={handleRetake} />;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No test questions available for this class.</p>
        <Link to="/disciple/pathway" className="text-church-600 hover:underline mt-4 inline-block">&larr; Back to Pathway</Link>
      </div>
    );
  }

  const q = questions[currentQ];
  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const isLowTime = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Knowledge Check</h1>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <span className={`font-mono text-sm font-medium px-3 py-1 rounded-full ${
              isLowTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-600'
            }`}>
              {formatTime(timeLeft)}
            </span>
          )}
          <span className="text-sm text-gray-500">{currentQ + 1} of {questions.length}</span>
        </div>
      </div>

      {isLowTime && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4 text-center">
          Time is running out! Your answers will be submitted automatically.
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div className="bg-church-600 h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{q.question_text}</h2>
        {q.is_multi_choice ? (
          <div className="space-y-2">
            {q.options.map(opt => (
              <label key={opt.id} className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                (answers[q.id] || []).includes(opt.id) ? 'border-church-500 bg-church-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="checkbox" className="mr-3" checked={(answers[q.id] || []).includes(opt.id)}
                  onChange={() => {
                    const prev = answers[q.id] || [];
                    const next = prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id];
                    handleAnswer(q.id, next);
                  }} />
                {opt.option_text}
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {q.options.map(opt => (
              <label key={opt.id} className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                answers[q.id] === opt.id ? 'border-church-500 bg-church-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" className="mr-3" name={`q-${q.id}`} checked={answers[q.id] === opt.id}
                  onChange={() => handleAnswer(q.id, opt.id)} />
                {opt.option_text}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button disabled={currentQ === 0} onClick={() => setCurrentQ(q => q - 1)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30">
          Previous
        </button>
        {currentQ < questions.length - 1 ? (
          <button onClick={() => setCurrentQ(q => q + 1)}
            className="px-6 py-2 bg-church-600 text-white rounded-lg hover:bg-church-700">
            Next
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)} disabled={!allAnswered || submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ result, questions, classId, onRetake }) {
  const passed = result.is_passed;
  const percentage = Math.round((result.score / result.max_score) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl shadow-sm border p-8 text-center mb-6 ${
        passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="text-5xl mb-4">{passed ? '🎉' : '😔'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-700' : 'text-red-700'}`}>
          {passed ? 'Congratulations! You Passed!' : 'Test Not Passed'}
        </h2>
        <p className={`text-lg ${passed ? 'text-green-600' : 'text-red-600'}`}>
          Score: {result.score}/{result.max_score} ({percentage}%)
        </p>
        <p className="text-sm text-gray-500 mt-2">Attempt {result.attempts} of {result.max_attempts}</p>
      </div>

      <div className="space-y-4 mb-6">
        {result.results?.map((r, i) => (
          <div key={i} className={`bg-white rounded-lg border p-4 ${
            r.is_correct ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <span className={`text-lg flex-shrink-0 ${r.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                {r.is_correct ? '✓' : '✗'}
              </span>
              <div>
                <p className="font-medium text-gray-800">{r.question_text}</p>
                <div className="mt-2 text-sm">
                  {r.all_options?.map(opt => {
                    const isUserAnswer = (r.user_answers || []).includes(opt.id);
                    const isCorrectOption = opt.is_correct;
                    let className = 'block px-3 py-1.5 rounded mb-1 ';
                    if (isCorrectOption) className += 'bg-green-50 text-green-700 border border-green-200';
                    else if (isUserAnswer && !isCorrectOption) className += 'bg-red-50 text-red-700 border border-red-200';
                    else className += 'text-gray-500';

                    return (
                      <div key={opt.id} className={className}>
                        {opt.option_text}
                        {isCorrectOption && <span className="ml-2 text-green-600 font-medium">(Correct)</span>}
                        {isUserAnswer && !isCorrectOption && <span className="ml-2 text-red-600 font-medium">(Your Answer)</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {passed ? (
          <Link to="/disciple/pathway"
            className="bg-church-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-church-700 text-center">
            Continue Pathway
          </Link>
        ) : (
          <>
            {result.attempts < result.max_attempts && (
              <button onClick={onRetake}
                className="bg-church-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-church-700">
                Retake Test
              </button>
            )}
            <Link to={`/disciple/class/${classId}`}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 text-center">
              Review Class
            </Link>
          </>
        )}
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
