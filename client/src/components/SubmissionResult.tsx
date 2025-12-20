import { TestCaseResult } from '../types';

interface Props {
  results: TestCaseResult[];
  overallStatus: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  SUCCESS: { label: 'Accepted', color: '#10b981', icon: '✓' },
  WA: { label: 'Wrong Answer', color: '#ef4444', icon: '✗' },
  TLE: { label: 'Time Limit Exceeded', color: '#f59e0b', icon: '⏱' },
  RE: { label: 'Runtime Error', color: '#ef4444', icon: '💥' },
  MLE: { label: 'Memory Limit Exceeded', color: '#f59e0b', icon: '📦' },
  PENDING: { label: 'Pending', color: '#6b7280', icon: '⏳' },
  UNKNOWN: { label: 'Unknown', color: '#6b7280', icon: '?' },
};

export default function SubmissionResult({ results, overallStatus }: Props) {
  const statusCfg = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.UNKNOWN;

  return (
    <div className="submission-result">
      <div className="result-header" style={{ borderLeftColor: statusCfg.color }}>
        <span className="result-icon">{statusCfg.icon}</span>
        <span className="result-label" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
        <span className="result-count">
          {results.filter(r => r.status === 'SUCCESS').length}/{results.length} passed
        </span>
      </div>

      <div className="test-cases-grid">
        {results.map((tc, i) => {
          const tcCfg = STATUS_CONFIG[tc.status] || STATUS_CONFIG.UNKNOWN;
          return (
            <div key={i} className={`test-case-card ${tc.status === 'SUCCESS' ? 'passed' : 'failed'}`}>
              <div className="tc-header">
                <span className="tc-number">Test Case {i + 1}</span>
                <span className="tc-status" style={{ color: tcCfg.color }}>
                  {tcCfg.icon} {tcCfg.label}
                </span>
              </div>
              {tc.status !== 'SUCCESS' && (
                <div className="tc-details">
                  <div className="tc-row">
                    <span className="tc-label">Input:</span>
                    <code>{tc.input}</code>
                  </div>
                  <div className="tc-row">
                    <span className="tc-label">Expected:</span>
                    <code className="expected">{tc.expected}</code>
                  </div>
                  <div className="tc-row">
                    <span className="tc-label">Got:</span>
                    <code className="actual">{tc.actual}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
