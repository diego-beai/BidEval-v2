import React from 'react';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { DashboardRequirement, ProviderResponse } from '../../../types/dashboard';

export const ClarificationView: React.FC = () => {
    const { data, activeProviderId, setActiveProvider, updateQuestionStatus } = useDashboardStore();
    const { t } = useLanguageStore();

    if (!data) return <div>Loading data...</div>;

    const activeProvider = data.providers.find(p => p.id === activeProviderId) || data.providers[0];

    const getRequirement = (reqId: string): DashboardRequirement | undefined => {
        return data.requirements.find(r => r.id === reqId);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Full': return 'status-full';
            case 'Partial': return 'status-partial';
            case 'Not Found': return 'status-not-found';
            case 'Ambiguous': return 'status-ambiguous';
            default: return '';
        }
    };

    const handleAction = (reqId: string, currentStatus: string | undefined) => {
        // Logic to approve or mark resolved
        const newStatus = currentStatus === 'pending' ? 'approved' : 'resolved';
        updateQuestionStatus(activeProvider.id, reqId, newStatus);
    };

    return (
        <div className="clarification-layout">
            {/* Provider Filter */}
            <div className="provider-filter">
                {data.providers.map(p => (
                    <button
                        key={p.id}
                        className={`provider-chip ${activeProviderId === p.id ? 'active' : ''}`}
                        onClick={() => setActiveProvider(p.id)}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            <div className="card">
                <div className="qa-table-container">
                    <table className="qa-table">
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>{t('clarification.table.req')}</th>
                                <th style={{ width: '30%' }}>{t('clarification.table.resp')}</th>
                                <th style={{ width: '15%' }}>{t('clarification.table.comp')}</th>
                                <th style={{ width: '30%' }}>{t('clarification.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeProvider.responses.map((resp: ProviderResponse) => {
                                const req = getRequirement(resp.req_id);
                                return (
                                    <tr key={resp.req_id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{req?.category}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {req?.text}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                                {resp.match_text || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(resp.status)}`}>
                                                {resp.status}
                                            </span>
                                        </td>
                                        <td>
                                            {(resp.status !== 'Full' || resp.generated_question) && (
                                                <div className="qa-action-area">
                                                    <textarea
                                                        className="generated-question"
                                                        defaultValue={resp.generated_question}
                                                        readOnly={resp.question_status === 'resolved'}
                                                        rows={2}
                                                    />
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {resp.question_status !== 'resolved' ? (
                                                            <button
                                                                className="btn btnPrimary"
                                                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                                onClick={() => handleAction(resp.req_id, resp.question_status || 'pending')}
                                                            >
                                                                {resp.question_status === 'approved' ? t('clarification.btn.send') : t('clarification.btn.approve')}
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--color-success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                                                                {t('clarification.status.resolved')}
                                                            </span>
                                                        )}

                                                        {resp.question_status !== 'resolved' && (
                                                            <button
                                                                className="btn btnSecondary"
                                                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                                onClick={() => updateQuestionStatus(activeProvider.id, resp.req_id, 'resolved')}
                                                            >
                                                                {t('clarification.btn.resolve')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn btnSecondary"
                    onClick={() => {
                        if (!activeProvider) return;
                        const headers = ['Requirement', 'Category', 'Response', 'Compliance', 'Question Status', 'Question'];
                        const rows = activeProvider.responses.map(resp => {
                            const req = getRequirement(resp.req_id);
                            return [
                                req?.text || '',
                                req?.category || '',
                                resp.match_text || '',
                                resp.status,
                                resp.question_status || 'pending',
                                resp.generated_question || ''
                            ].map(cell => `"${(typeof cell === 'string' ? cell : '').replace(/"/g, '""')}"`).join(',');
                        });

                        const csvContent = [headers.join(','), ...rows].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${activeProvider.name}_clarifications.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                >
                    {t('clarification.export')}
                </button>
            </div>
        </div>
    );
};
