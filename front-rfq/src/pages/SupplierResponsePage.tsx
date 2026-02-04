import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguageStore } from '../stores/useLanguageStore';
import './SupplierResponsePage.css';

interface Question {
  id: string;
  question: string;
  discipline: string;
  importance: 'High' | 'Medium' | 'Low';
  provider_name: string;
  project_id: string;
  parent_question_id?: string | null;
}

interface ConversationItem {
  id: string;
  question: string;
  response?: string | null;
}

interface TokenData {
  id: string;
  project_id: string;
  provider_name: string;
  token: string;
  question_ids: string[];
  expires_at: string;
  status: 'pending' | 'accessed' | 'responded' | 'expired';
}

interface ProjectData {
  id: string;
  display_name: string;
}

type PageState = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'submitted' | 'error';

// Use proxy in development to avoid CORS issues
const N8N_PROCESS_RESPONSES_URL = import.meta.env.DEV
  ? '/api/n8n/qa-process-responses'
  : (import.meta.env.VITE_N8N_QA_PROCESS_RESPONSES_URL || 'https://n8n.beaienergy.com/webhook/qa-process-responses');

export function SupplierResponsePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguageStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState<Record<string, ConversationItem[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Load token data and questions
  const loadData = useCallback(async () => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    if (!supabase) {
      setErrorMessage('Database connection not available');
      setPageState('error');
      return;
    }

    try {
      // Cast supabase to any to avoid type issues with untyped tables
      const db = supabase as any;

      // 1. Validate token
      const { data: tokenResult, error: tokenError } = await db
        .from('qa_response_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (tokenError || !tokenResult) {
        setPageState('invalid');
        return;
      }

      const tokenInfo = tokenResult as unknown as TokenData;
      setTokenData(tokenInfo);

      // Check if already responded
      if (tokenInfo.status === 'responded') {
        setPageState('used');
        return;
      }

      // Check if expired
      if (new Date(tokenInfo.expires_at) < new Date()) {
        setPageState('expired');
        return;
      }

      // 2. Mark as accessed if first time
      if (tokenInfo.status === 'pending') {
        await db
          .from('qa_response_tokens')
          .update({
            status: 'accessed',
            accessed_at: new Date().toISOString()
          })
          .eq('token', token);
      }

      // 3. Get project info
      const { data: projectResult } = await db
        .from('projects')
        .select('id, display_name')
        .eq('id', tokenInfo.project_id)
        .single();

      if (projectResult) {
        setProjectData(projectResult as ProjectData);
      }

      // 4. Get questions (including parent_question_id and response)
      if (!tokenInfo.question_ids || tokenInfo.question_ids.length === 0) {
        setQuestions([]);
        setResponses({});
        setPageState('valid');
        return;
      }

      const { data: questionsResult, error: questionsError } = await db
        .from('qa_audit')
        .select('id, question, discipline, importance, provider_name, project_id, parent_question_id, response')
        .in('id', tokenInfo.question_ids);

      if (questionsError) {
        setErrorMessage('Error loading questions');
        setPageState('error');
        return;
      }

      const questionsData = (questionsResult || []) as unknown as Question[];
      setQuestions(questionsData);

      // Initialize responses object
      const initialResponses: Record<string, string> = {};
      questionsData.forEach((q: Question) => {
        initialResponses[q.id] = '';
      });
      setResponses(initialResponses);

      // 5. Load conversation history for questions that are follow-ups
      const historyMap: Record<string, ConversationItem[]> = {};
      for (const q of questionsData) {
        if (q.parent_question_id) {
          // Load the full thread (all ancestors)
          const thread: ConversationItem[] = [];
          let currentParentId: string | null | undefined = q.parent_question_id;

          while (currentParentId) {
            const { data: parentResult } = await db
              .from('qa_audit')
              .select('id, question, response, parent_question_id')
              .eq('id', currentParentId)
              .single();

            const parentData = parentResult as { id: string; question: string; response?: string | null; parent_question_id?: string | null } | null;

            if (parentData) {
              thread.unshift({
                id: parentData.id,
                question: parentData.question,
                response: parentData.response
              });
              currentParentId = parentData.parent_question_id;
            } else {
              break;
            }
          }

          if (thread.length > 0) {
            historyMap[q.id] = thread;
          }
        }
      }
      setConversationHistory(historyMap);

      setPageState('valid');

    } catch (err) {
      console.error('Error loading data:', err);
      setErrorMessage('An unexpected error occurred');
      setPageState('error');
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle response change
  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Calculate progress
  const answeredCount = Object.values(responses).filter(r => r.trim().length > 0).length;
  const totalCount = questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Submit responses
  const handleSubmit = async () => {
    if (answeredCount === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare responses array
      const responsesArray = Object.entries(responses)
        .filter(([, text]) => text.trim().length > 0)
        .map(([questionId, responseText]) => ({
          question_id: questionId,
          response_text: responseText.trim()
        }));

      // Call n8n webhook to process responses
      const response = await fetch(N8N_PROCESS_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          responses: responsesArray
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit responses');
      }

      setPageState('submitted');

    } catch (err) {
      console.error('Error submitting responses:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit responses');
      setPageState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get importance color
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#22c55e';
      default: return '#64748b';
    }
  };

  // Toggle conversation history expansion
  const toggleHistoryExpansion = (questionId: string) => {
    setExpandedHistory(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Render loading state
  if (pageState === 'loading') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-loading">
            <div className="spinner-large" />
            <p>Loading questionnaire...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render invalid token
  if (pageState === 'invalid') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2>Invalid Link</h2>
            <p>This questionnaire link is not valid. Please check the link in your email or contact the evaluation team.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render expired token
  if (pageState === 'expired') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2>Link Expired</h2>
            <p>This questionnaire link has expired. Please contact the evaluation team to request a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render already used token
  if (pageState === 'used') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message info">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Already Submitted</h2>
            <p>Responses for this questionnaire have already been submitted. Thank you for your participation.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render success state
  if (pageState === 'submitted') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message success">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Responses Submitted</h2>
            <p>Thank you for completing the technical questionnaire. Your responses have been recorded successfully.</p>
            <div className="success-detail">
              {answeredCount} of {totalCount} questions answered
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (pageState === 'error') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Error</h2>
            <p>{errorMessage || 'An unexpected error occurred. Please try again later.'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render questionnaire form
  return (
    <div className="supplier-page">
      <div className="supplier-container">
        {/* Header */}
        <header className="supplier-header">
          <div className="header-logo">
            <span className="logo-bid">Bid</span>
            <span className="logo-eval">Eval</span>
          </div>
          <h1>Technical Questionnaire</h1>
          <p className="project-name">Project: {projectData?.display_name || 'Technical Evaluation'}</p>
          <div className="provider-badge">
            Responding as: <strong>{tokenData?.provider_name}</strong>
          </div>
        </header>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-info">
            <span>{answeredCount} of {totalCount} questions answered</span>
            <span className="progress-percent">{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions">
          <h3>Instructions</h3>
          <p>
            Please provide detailed responses to each question below. Your answers will help us
            better understand your proposal and evaluate the technical aspects of your offer.
            All responses are confidential and will only be used for evaluation purposes.
          </p>
        </div>

        {/* Questions */}
        <div className="questions-container">
          {questions.map((question, index) => (
            <div key={question.id} className={`question-card ${question.parent_question_id ? 'follow-up-question' : ''}`}>
              <div className="question-header">
                <span className="question-number">
                  {question.parent_question_id ? t('supplier.followup_question') : `${t('supplier.question')} ${index + 1}`}
                </span>
                <div className="question-badges">
                  <span className="badge discipline">{question.discipline}</span>
                  <span
                    className="badge importance"
                    style={{ backgroundColor: getImportanceColor(question.importance) }}
                  >
                    {question.importance}
                  </span>
                </div>
              </div>

              {/* Conversation History for Follow-up Questions */}
              {conversationHistory[question.id] && conversationHistory[question.id].length > 0 && (
                <div className="conversation-history-section">
                  <button
                    className="history-toggle-btn"
                    onClick={() => toggleHistoryExpansion(question.id)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`toggle-icon ${expandedHistory[question.id] ? 'expanded' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>
                      {expandedHistory[question.id]
                        ? t('supplier.hide_history')
                        : t('supplier.view_history')}
                    </span>
                    <span className="history-count">
                      ({conversationHistory[question.id].length} {t('supplier.previous_exchanges')})
                    </span>
                  </button>

                  {expandedHistory[question.id] && (
                    <div className="conversation-history-content">
                      {conversationHistory[question.id].map((historyItem, hIndex) => (
                        <div key={historyItem.id} className="history-item">
                          <div className="history-question">
                            <span className="history-label">{t('supplier.previous_question')} #{hIndex + 1}</span>
                            <p>{historyItem.question}</p>
                          </div>
                          <div className="history-response">
                            <span className="history-label">{t('supplier.your_previous_response')}</span>
                            <p>{historyItem.response || t('supplier.no_response')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="question-text">{question.question}</p>

              <div className="response-area">
                <label htmlFor={`response-${question.id}`}>Your Response</label>
                <textarea
                  id={`response-${question.id}`}
                  placeholder="Enter your response here..."
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                />
                {responses[question.id]?.trim() && (
                  <div className="response-status answered">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Answered
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Section */}
        <div className="submit-section">
          <div className="submit-summary">
            <p>
              You have answered <strong>{answeredCount}</strong> of <strong>{totalCount}</strong> questions.
              {answeredCount < totalCount && (
                <span className="warning-text"> ({totalCount - answeredCount} remaining)</span>
              )}
            </p>
          </div>

          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting || answeredCount === 0}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-small" />
                Submitting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Submit Responses
              </>
            )}
          </button>

          {answeredCount === 0 && (
            <p className="submit-warning">Please answer at least one question before submitting</p>
          )}
        </div>

        {/* Footer */}
        <footer className="supplier-footer">
          <p>Powered by BidEval - Technical Evaluation Platform</p>
          <p className="footer-note">
            Link expires: {tokenData?.expires_at ? new Date(tokenData.expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'N/A'}
          </p>
        </footer>
      </div>
    </div>
  );
}
