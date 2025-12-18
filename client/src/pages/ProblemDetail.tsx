import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getProblem, submitCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import CodeEditor from '../components/CodeEditor';
import SubmissionResult from '../components/SubmissionResult';
import { Problem, TestCaseResult } from '../types';

const LANGUAGES = ['PYTHON', 'JAVA', 'CPP'];

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('PYTHON');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const [resultData, setResultData] = useState<TestCaseResult[]>([]);
  const [waitingForResult, setWaitingForResult] = useState(false);

  // WebSocket handler for real-time results
  const handleResult = useCallback((payload: any) => {
    setWaitingForResult(false);
    setResultStatus(payload.status);
    setResultData(payload.response || []);
    setSubmitting(false);
  }, []);

  useSocket(handleResult);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProblem(id)
      .then((res) => {
        setProblem(res.data);
        // Set default code from code stub
        const stub = res.data.codeStubs?.find(
          (s) => s.language.toUpperCase() === language
        );
        if (stub) setCode(stub.userSnippet || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Update code when language changes
  useEffect(() => {
    if (!problem) return;
    const stub = problem.codeStubs?.find(
      (s) => s.language.toUpperCase() === language
    );
    if (stub) setCode(stub.userSnippet || '');
  }, [language, problem]);

  const handleSubmit = async () => {
    if (!problem || !user || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    setResultStatus(null);
    setResultData([]);
    setWaitingForResult(true);

    try {
      await submitCode(problem._id, code, language, user.id);
    } catch (err: any) {
      setSubmitting(false);
      setWaitingForResult(false);
      if (err.message?.includes('Rate limit')) {
        setSubmitError('⏱ Rate limit exceeded. Please wait before submitting again.');
      } else {
        setSubmitError(err.message || 'Submission failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner" />
        <p>Loading problem...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error || 'Problem not found'}</div>
      </div>
    );
  }

  return (
    <div className="problem-detail-page">
      <div className="problem-panel">
        <div className="problem-header-detail">
          <h1>{problem.title}</h1>
          <span className={`difficulty-tag ${problem.difficulty?.toLowerCase()}`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="problem-description"
          dangerouslySetInnerHTML={{ __html: problem.description }}
        />

        <div className="problem-section">
          <h3>Examples</h3>
          {problem.testCases?.slice(0, 2).map((tc, i) => (
            <div key={i} className="example-box">
              <div><strong>Input:</strong> <code>{tc.input}</code></div>
              <div><strong>Output:</strong> <code>{tc.output}</code></div>
            </div>
          ))}
        </div>

        <div className="problem-section">
          <h3>Constraints</h3>
          <ul className="constraints-list">
            <li>Time Limit: {language === 'JAVA' ? '10s' : '5s'}</li>
            <li>Memory Limit: 256 MB</li>
            <li>Languages: Python, Java, C++</li>
          </ul>
        </div>
      </div>

      <div className="editor-panel">
        <div className="editor-toolbar">
          <div className="language-selector">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                className={`lang-btn ${language === lang ? 'active' : ''}`}
                onClick={() => setLanguage(lang)}
                disabled={submitting}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-submit"
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
          >
            {submitting ? (
              <>
                <span className="spinner-sm" />
                {waitingForResult ? 'Judging...' : 'Submitting...'}
              </>
            ) : (
              '▶ Submit'
            )}
          </button>
        </div>

        <CodeEditor language={language} value={code} onChange={setCode} readOnly={submitting} />

        {submitError && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            {submitError}
          </div>
        )}

        {waitingForResult && (
          <div className="judging-indicator">
            <div className="spinner" />
            <p>Running your code against test cases...</p>
          </div>
        )}

        {resultStatus && (
          <SubmissionResult results={resultData} overallStatus={resultStatus} />
        )}
      </div>
    </div>
  );
}
