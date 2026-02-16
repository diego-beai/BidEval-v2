import { useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useCommunicationsStore } from '../../stores/useCommunicationsStore';
import type { TimelineItem, Communication, QATimelineItem } from '../../types/communications.types';

interface TimelineEntryProps {
  item: TimelineItem;
  onNavigateQA?: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  email: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  call: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  meeting: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  note: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
      <path d="M14 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  ),
  qa: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

function relativeTime(dateStr: string, t: (k: string) => string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('comm.ago.just_now');
  if (mins < 60) return `${mins}${t('comm.ago.minutes')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t('comm.ago.hours')}`;
  const days = Math.floor(hours / 24);
  return `${days}${t('comm.ago.days')}`;
}

export const TimelineEntry = ({ item, onNavigateQA }: TimelineEntryProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const { t } = useLanguageStore();
  const { deleteCommunication, updateCommunication } = useCommunicationsStore();

  // Edit state
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editParticipants, setEditParticipants] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const isQA = item.type === 'qa';
  const icon = typeIcons[item.type] || typeIcons.note;

  const startEditing = (comm: Communication) => {
    setEditSubject(comm.subject || '');
    setEditBody(comm.body || '');
    setEditNotes(comm.notes || '');
    setEditDuration(comm.duration_minutes ? String(comm.duration_minutes) : '');
    setEditParticipants(comm.participants ? comm.participants.join(', ') : '');
    setEditLocation(comm.location || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEditing = async (comm: Communication) => {
    await updateCommunication(comm.id, {
      subject: editSubject || undefined,
      body: editBody || undefined,
      notes: editNotes || null,
      duration_minutes: editDuration ? parseInt(editDuration) : null,
      participants: editParticipants ? editParticipants.split(',').map(p => p.trim()).filter(Boolean) : null,
      location: editLocation || null,
    } as Partial<Communication>);
    setEditing(false);
  };

  if (isQA) {
    const qa = item.data as QATimelineItem;
    return (
      <div className="comm-entry" onClick={() => setExpanded(!expanded)}>
        <div className="comm-entry-bar qa" />
        <div className="comm-entry-content">
          <div className="comm-entry-header">
            <div className="comm-entry-icon qa">{icon}</div>
            <span className="comm-entry-date">{relativeTime(item.date, t)}</span>
          </div>
          <div className="comm-entry-title">{qa.question}</div>
          <div className="comm-entry-badges">
            <span className="comm-badge discipline">{qa.discipline}</span>
            {qa.importance && <span className="comm-badge importance">{qa.importance}</span>}
            <span className={`comm-badge status ${qa.status === 'Approved' ? '' : 'pending'}`}>
              {qa.status}
            </span>
          </div>
          {expanded && (
            <div className="comm-entry-detail">
              {qa.response ? (
                <>
                  <strong>{t('comm.qa_response')}:</strong>
                  <br />
                  {qa.response}
                </>
              ) : (
                <em>{t('comm.qa_no_response')}</em>
              )}
              <div className="comm-entry-detail-actions">
                {onNavigateQA && (
                  <button className="primary" onClick={(e) => { e.stopPropagation(); onNavigateQA(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {t('comm.view_in_qa')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const comm = item.data as Communication;
  const title = comm.subject || comm.notes || t(`comm.type.${comm.comm_type}`);
  const preview = comm.body || comm.notes || '';

  return (
    <div className="comm-entry" onClick={() => { if (!editing) setExpanded(!expanded); }}>
      <div className={`comm-entry-bar ${comm.comm_type}`} />
      <div className="comm-entry-content">
        <div className="comm-entry-header">
          <div className={`comm-entry-icon ${comm.comm_type}`}>{icon}</div>
          <span className="comm-entry-date">{relativeTime(item.date, t)}</span>
        </div>

        {editing ? (
          /* ---- EDIT MODE ---- */
          <div className="comm-entry-edit" onClick={(e) => e.stopPropagation()}>
            <div className="comm-form-group">
              <label>{t('comm.form.subject')}</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>

            {(comm.comm_type === 'email') && (
              <div className="comm-form-group">
                <label>Body</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {(comm.comm_type === 'call' || comm.comm_type === 'meeting') && (
              <div className="comm-form-row">
                <div className="comm-form-group">
                  <label>{t('comm.form.duration')}</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            )}

            {comm.comm_type === 'meeting' && (
              <>
                <div className="comm-form-group">
                  <label>{t('comm.form.participants')}</label>
                  <input
                    type="text"
                    value={editParticipants}
                    onChange={(e) => setEditParticipants(e.target.value)}
                  />
                </div>
                <div className="comm-form-group">
                  <label>{t('comm.form.location')}</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="comm-form-group">
              <label>{t('comm.form.notes')}</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="comm-form-actions">
              <button className="btn-cancel" onClick={cancelEditing}>
                {t('comm.edit.cancel')}
              </button>
              <button className="btn-save" onClick={() => saveEditing(comm)}>
                {t('comm.edit.save')}
              </button>
            </div>
          </div>
        ) : (
          /* ---- VIEW MODE ---- */
          <>
            <div className="comm-entry-title">{title}</div>
            {!expanded && preview && (
              <div className="comm-entry-preview">{preview.substring(0, 150)}</div>
            )}
            <div className="comm-entry-badges">
              <span className={`comm-badge status ${comm.status === 'failed' ? 'failed' : ''}`}>
                {t(`comm.status.${comm.status}`)}
              </span>
              {comm.duration_minutes && (
                <span className="comm-badge duration">
                  {comm.duration_minutes} {t('comm.minutes')}
                </span>
              )}
              {comm.participants && comm.participants.length > 0 && (
                <span className="comm-badge participants">
                  {comm.participants.length} {t('comm.participants').toLowerCase()}
                </span>
              )}
              {comm.location && (
                <span className="comm-badge discipline">{comm.location}</span>
              )}
            </div>
            {expanded && (
              <div className="comm-entry-detail">
                {comm.body || comm.notes || ''}
                {comm.recipient_email && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {t('mail.preview.to')} {comm.recipient_email}
                  </div>
                )}
                <div className="comm-entry-detail-actions">
                  <button
                    className="edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(comm);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {t('comm.edit')}
                  </button>
                  <button
                    className="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('comm.delete_confirm'))) {
                        deleteCommunication(comm.id);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
