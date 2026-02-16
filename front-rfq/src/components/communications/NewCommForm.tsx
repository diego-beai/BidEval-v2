import { useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useCommunicationsStore } from '../../stores/useCommunicationsStore';
import { useProjectStore } from '../../stores/useProjectStore';
import type { CommunicationType } from '../../types/communications.types';

interface NewCommFormProps {
  type: CommunicationType;
  providerName: string;
  onClose: () => void;
}

export const NewCommForm = ({ type, providerName, onClose }: NewCommFormProps) => {
  const { t } = useLanguageStore();
  const { createCommunication } = useCommunicationsStore();
  const { activeProjectId } = useProjectStore();

  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [participants, setParticipants] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  const handleSave = async () => {
    if (!activeProjectId) return;

    await createCommunication({
      project_id: activeProjectId,
      provider_name: providerName,
      comm_type: type,
      subject: subject || t(`comm.type.${type}`),
      body: '',
      notes: notes || null,
      tone: '',
      status: 'logged',
      qa_item_ids: [],
      duration_minutes: duration ? parseInt(duration) : null,
      participants: participants ? participants.split(',').map(p => p.trim()).filter(Boolean) : null,
      location: location || null,
      sent_at: new Date(date).toISOString(),
      recipient_email: null,
      attachments: null,
    });

    onClose();
  };

  const typeLabels: Record<string, string> = {
    call: t('comm.new.call'),
    meeting: t('comm.new.meeting'),
    note: t('comm.new.note'),
  };

  const typeColors: Record<string, string> = {
    call: '#10b981',
    meeting: '#3b82f6',
    note: 'var(--text-tertiary)',
  };

  return (
    <div className="comm-new-form">
      <div className="comm-new-form-header">
        <div className="comm-new-form-title">
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: typeColors[type] || 'var(--text-tertiary)',
          }} />
          {typeLabels[type] || type}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="comm-form-group">
        <label>{t('comm.form.subject')}</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={typeLabels[type]}
        />
      </div>

      <div className="comm-form-row">
        <div className="comm-form-group">
          <label>{t('comm.form.date')}</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {(type === 'call' || type === 'meeting') && (
          <div className="comm-form-group">
            <label>{t('comm.form.duration')}</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              min="1"
            />
          </div>
        )}
      </div>

      {type === 'meeting' && (
        <>
          <div className="comm-form-group">
            <label>{t('comm.form.participants')}</label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Juan, Maria, Pedro"
            />
          </div>
          <div className="comm-form-group">
            <label>{t('comm.form.location')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sala B / Teams / Zoom"
            />
          </div>
        </>
      )}

      <div className="comm-form-group">
        <label>{t('comm.form.notes')}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={type === 'note' ? t('comm.form.notes') : ''}
          rows={3}
        />
      </div>

      <div className="comm-form-actions">
        <button className="btn-cancel" onClick={onClose}>
          {t('comm.form.cancel')}
        </button>
        <button className="btn-save" onClick={handleSave}>
          {t('comm.form.save')}
        </button>
      </div>
    </div>
  );
};
