import React, { useMemo, useEffect, useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useRfqStore } from '../../stores/useRfqStore';
import { useScoringStore } from '../../stores/useScoringStore';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useQAStore } from '../../stores/useQAStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { useProviderStore } from '../../stores/useProviderStore';
import { supabase } from '../../lib/supabase';
import './Dashboard.css';

interface HomeDashboardProps {
    onNavigate: (view: string) => void;
    onNewProject?: () => void;
}

const normalizeProviderName = (name: string) => {
    return name
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, '');
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate, onNewProject }) => {
    const { t } = useLanguageStore();
    const {
        totalProposals,
        proposalsThisWeek,
        proposalsGrowthPercentage,
        loadDashboardData,
        stopRealtimeUpdates,
        startRealtimeUpdates
    } = useDashboardStore();

    const { tableData, proposalEvaluations, providerRanking, fetchAllTableData, fetchProposalEvaluations, fetchPivotTableData, fetchProviderRanking, refreshProposalEvaluations } = useRfqStore();

    // Project store to listen for project changes
    const { activeProjectId } = useProjectStore();

    // Scoring data from workflow results
    const { scoringResults, refreshScoring } = useScoringStore();

    // Scoring configuration (dynamic criteria per project)
    const { categories: scoringCategories, criteria: scoringCriteria, loadConfiguration: loadScoringConfig } = useScoringConfigStore();

    // Q&A notifications for activity feed
    const { notifications, loadNotifications, questions } = useQAStore();

    // Dynamic providers
    const { projectProviders } = useProviderStore();

    // Load data on mount
    useEffect(() => {
        loadDashboardData();
        startRealtimeUpdates();
        fetchAllTableData();
        fetchProposalEvaluations();
        fetchPivotTableData();
        fetchProviderRanking();
        // Always refresh scoring results from database to get latest data
        refreshScoring();
        // Load Q&A notifications for activity feed
        loadNotifications();
    }, [loadDashboardData, startRealtimeUpdates, fetchAllTableData, fetchProposalEvaluations, fetchPivotTableData, fetchProviderRanking, refreshScoring, loadNotifications]);

    // Reload all data when active project changes
    useEffect(() => {
        // Reload all data filtered by the new project
        loadDashboardData();
        fetchAllTableData();
        fetchProposalEvaluations();
        fetchPivotTableData();
        fetchProviderRanking();
        refreshScoring();
        loadNotifications();
        if (activeProjectId) loadScoringConfig(activeProjectId);
    }, [activeProjectId, loadDashboardData, fetchAllTableData, fetchProposalEvaluations, fetchPivotTableData, fetchProviderRanking, refreshScoring, loadNotifications, loadScoringConfig]);

    // Cleanup realtime updates on unmount
    React.useEffect(() => {
        return () => {
            stopRealtimeUpdates();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh proposal evaluations periodically
    React.useEffect(() => {
        const refreshInterval = setInterval(() => {
            refreshProposalEvaluations();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(refreshInterval);
    }, [refreshProposalEvaluations]);

    // Calculate provider evaluations from ranking data (cumplimiento_porcentual / 10)
    const providerEvaluations = useMemo(() => {
        const evaluations: Record<string, Record<string, number>> = {};

        const normalizeEvaluationType = (evalType: string) => {
            const v = evalType.trim().toLowerCase();
            if (v.includes('pre-feed') || v.includes('pre feed')) return 'Others';
            if (v.includes('feed') && !v.includes('econom') && !v.includes('technic')) return 'Others';
            if (v.includes('econom')) return 'Economical Evaluation';
            if (v.includes('technic')) return 'Technical Evaluation';
            if (v === 'others' || v === 'other') return 'Others';
            return evalType.trim();
        };

        const providerTypes: Record<string, Set<string>> = {};

        const matchProvider = (rawName: string): string | null => {
            const norm = normalizeProviderName(rawName);
            for (const p of projectProviders) {
                const pNorm = normalizeProviderName(p);
                if (pNorm === norm) return p;
                // Handle TR/TECNICASREUNIDAS alias
                if ((pNorm === 'TR' && norm === 'TECNICASREUNIDAS') || (pNorm === 'TECNICASREUNIDAS' && norm === 'TR')) return p;
            }
            return null;
        };

        const registerProviderType = (providerRaw: any, evalTypeRaw: any) => {
            if (!providerRaw || !evalTypeRaw) return;
            const provider = matchProvider(String(providerRaw));
            if (!provider) return;
            const evalType = normalizeEvaluationType(String(evalTypeRaw));
            if (!providerTypes[provider]) providerTypes[provider] = new Set<string>();
            providerTypes[provider].add(evalType);
        };

        // Initialize all dynamic providers with the 4 scoring categories
        projectProviders.forEach(provider => {
            evaluations[provider] = {
                'Technical': 0,      // 40%
                'Economic': 0,       // 30%
                'Execution': 0,      // 20%
                'HSE/ESG': 0         // 10%
            };
        });

        // Use provider ranking data if available
        if (providerRanking && providerRanking.length > 0) {


            if (tableData && tableData.length > 0) {
                tableData.forEach((item: any) => {
                    registerProviderType(item.Provider || item.provider, item.evaluation_type || item.evaluation);
                });
            }

            if (proposalEvaluations && proposalEvaluations.length > 0) {
                proposalEvaluations.forEach((item: any) => {
                    registerProviderType(item.provider_name, item.evaluation_type);
                });
            }

            const parseScore = (val: any): number | null => {
                if (val === null || val === undefined || val === '') return null;
                const n = typeof val === 'number' ? val : Number(String(val));
                return Number.isFinite(n) ? n : null;
            };

            const clampScore = (score: number) => Math.max(0, Math.min(10, score));
            const mergeScore = (prev: number | null, next: number | null) => {
                if (next === null) return prev;
                if (prev === null) return next;
                return Math.max(prev, next);
            };

            // Aggregate scores per provider (handles multiple rows per provider)
            const aggregated: Record<string, {
                technical: number | null;
                economic: number | null;
                execution: number | null;
                hseEsg: number | null;
            }> = {};

            providerRanking.forEach((ranking: any) => {
                const providerName = ranking.provider_name;
                if (!providerName) return;

                const normalizedProvider = matchProvider(String(providerName));
                if (!normalizedProvider) {
                    console.warn('[HomeDashboard] Provider not found in map:', providerName);
                    return;
                }

                if (!aggregated[normalizedProvider]) {
                    aggregated[normalizedProvider] = {
                        technical: null,
                        economic: null,
                        execution: null,
                        hseEsg: null
                    };
                }

                // Read from new column names (technical_score, economic_score, execution_score, hse_esg_score)
                aggregated[normalizedProvider].technical = mergeScore(
                    aggregated[normalizedProvider].technical,
                    parseScore(ranking.technical_score)
                );
                aggregated[normalizedProvider].economic = mergeScore(
                    aggregated[normalizedProvider].economic,
                    parseScore(ranking.economic_score || ranking.economical_score) // fallback for compatibility
                );
                aggregated[normalizedProvider].execution = mergeScore(
                    aggregated[normalizedProvider].execution,
                    parseScore(ranking.execution_score || ranking.pre_feed_score) // fallback for compatibility
                );
                aggregated[normalizedProvider].hseEsg = mergeScore(
                    aggregated[normalizedProvider].hseEsg,
                    parseScore(ranking.hse_esg_score || ranking.feed_score) // fallback for compatibility
                );
            });

            Object.entries(aggregated).forEach(([provider, scores]) => {
                evaluations[provider] = {
                    'Technical': scores.technical === null ? 0 : clampScore(scores.technical),
                    'Economic': scores.economic === null ? 0 : clampScore(scores.economic),
                    'Execution': scores.execution === null ? 0 : clampScore(scores.execution),
                    'HSE/ESG': scores.hseEsg === null ? 0 : clampScore(scores.hseEsg)
                };
            });

            // Reorder evaluation types (columns) by weight (Technical 40%, Economic 30%, Execution 20%, HSE/ESG 10%)
            const reorderEvaluationTypes = (evaluations: any) => {
                const providers = Object.keys(evaluations);


                // Fixed order by category weight (most important first)
                const sortedTypes = ['Technical', 'Economic', 'Execution', 'HSE/ESG'];

                // Reorder evaluations for each provider
                providers.forEach(provider => {
                    const reordered: any = {};
                    sortedTypes.forEach(type => {
                        reordered[type] = evaluations[provider][type] || 0;
                    });
                    evaluations[provider] = reordered;
                });

            };

            reorderEvaluationTypes(evaluations);
        } else {
            console.warn('[HomeDashboard] No provider ranking data available. Using fallback logic.');

            // Fallback to old logic if no ranking data
            // Count RFQ evaluations from tableData (rfq_items_master)
            if (tableData && tableData.length > 0) {
                tableData.forEach((item: any) => {
                    const itemProvider = item.Provider || item.provider;
                    if (!itemProvider) return;

                    const normalizedProvider = matchProvider(String(itemProvider));
                    if (!normalizedProvider) return;

                    const evalType = item.evaluation_type || item.evaluation;
                    if (!evalType) return;

                    // Normalize evaluation type
                    const evalTypeNormalized = evalType.trim();

                    if (!evaluations[normalizedProvider]) {
                        evaluations[normalizedProvider] = {};
                    }

                    if (!evaluations[normalizedProvider][evalTypeNormalized]) {
                        evaluations[normalizedProvider][evalTypeNormalized] = 0;
                    }

                    evaluations[normalizedProvider][evalTypeNormalized]++;
                });
            }

            // Count Proposal evaluations from proposalEvaluations (provider_responses)
            if (proposalEvaluations && proposalEvaluations.length > 0) {
                proposalEvaluations.forEach((item: any) => {
                    const itemProvider = item.provider_name;
                    if (!itemProvider) return;

                    const normalizedProvider = matchProvider(String(itemProvider));
                    if (!normalizedProvider) return;

                    const evalType = item.evaluation_type;
                    if (!evalType) return;

                    // Normalize evaluation type
                    const evalTypeNormalized = evalType.trim();

                    if (!evaluations[normalizedProvider]) {
                        evaluations[normalizedProvider] = {};
                    }

                    if (!evaluations[normalizedProvider][evalTypeNormalized]) {
                        evaluations[normalizedProvider][evalTypeNormalized] = 0;
                    }

                    evaluations[normalizedProvider][evalTypeNormalized]++;
                });
            }
        }

        return evaluations;
    }, [tableData, proposalEvaluations, providerRanking, projectProviders]);

    // Generate recent activity from both tableData and proposalEvaluations
    const recentActivity = useMemo(() => {
        const activities: any[] = [];

        // Add RFQ activities
        if (tableData && tableData.length > 0) {
            tableData.forEach((item: any) => {
                const date = new Date(item.created_at || item.updated_at);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);

                let timeAgo = '';
                if (diffDays > 0) {
                    timeAgo = diffDays === 1 ? t('home.activity.yesterday') : `${diffDays} ${t('home.activity.days_ago')}`;
                } else if (diffHours > 0) {
                    timeAgo = `${diffHours}h`;
                } else {
                    timeAgo = t('home.activity.just_now');
                }

                const provider = item.Provider || item.provider;
                const evalType = item.evaluation_type || item.evaluation;

                activities.push({
                    title: provider
                        ? `${t('home.activity.offer_received')} - ${provider}`
                        : `${evalType || 'RFQ'}`,
                    desc: item.requirement_text?.substring(0, 50) || `${item.phase || 'General'} - ${evalType || 'Evaluation'}`,
                    time: timeAgo,
                    type: provider ? 'success' : 'info',
                    timestamp: date.getTime()
                });
            });
        }

        // Add Proposal evaluation activities
        if (proposalEvaluations && proposalEvaluations.length > 0) {
            proposalEvaluations.forEach((item: any) => {
                const date = new Date(item.updated_at);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);

                let timeAgo = '';
                if (diffDays > 0) {
                    timeAgo = diffDays === 1 ? t('home.activity.yesterday') : `${diffDays} ${t('home.activity.days_ago')}`;
                } else if (diffHours > 0) {
                    timeAgo = `${diffHours}h`;
                } else {
                    timeAgo = t('home.activity.just_now');
                }

                activities.push({
                    title: `${t('home.activity.proposal_evaluated')} - ${item.provider_name}`,
                    desc: `${item.requirement_text || item.evaluation_type || 'Requirement'}: ${item.evaluation_value}`,
                    time: timeAgo,
                    type: 'success',
                    timestamp: date.getTime()
                });
            });
        }

        // Add Q&A notifications (supplier responses, questions sent, etc.)
        if (notifications && notifications.length > 0) {
            notifications.forEach((notification: any) => {
                const date = new Date(notification.created_at);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);

                let timeAgo = '';
                if (diffDays > 0) {
                    timeAgo = diffDays === 1 ? t('home.activity.yesterday') : `${diffDays} ${t('home.activity.days_ago')}`;
                } else if (diffHours > 0) {
                    timeAgo = `${diffHours}h`;
                } else {
                    timeAgo = t('home.activity.just_now');
                }

                // Determine activity type based on notification type
                let activityType = 'info';
                let translatedTitle = notification.title || t('home.activity.qa_update');

                if (notification.notification_type === 'supplier_responded') {
                    activityType = 'success';
                    translatedTitle = t('home.activity.supplier_responded');
                } else if (notification.notification_type === 'questions_sent') {
                    translatedTitle = t('home.activity.questions_sent');
                } else if (notification.notification_type === 'evaluation_updated') {
                    activityType = 'warning';
                    translatedTitle = t('home.activity.evaluation_updated');
                }

                // Translate message if it contains specific patterns
                let translatedMessage = notification.message || t('home.activity.qa_activity');
                if (notification.message && notification.message.includes('response(s) received')) {
                    translatedMessage = notification.message.replace('response(s) received', t('home.activity.response_received'));
                }

                activities.push({
                    title: translatedTitle,
                    desc: translatedMessage,
                    time: timeAgo,
                    type: activityType,
                    timestamp: date.getTime()
                });
            });
        }

        // Add Q&A questions activity (recently answered questions)
        if (questions && questions.length > 0) {
            const answeredQuestions = questions.filter((q: any) =>
                q.estado === 'Answered' || q.estado === 'Resolved' || q.status === 'Answered' || q.status === 'Resolved'
            );

            answeredQuestions.slice(0, 5).forEach((q: any) => {
                const date = new Date(q.fecha_respuesta || q.created_at);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);

                let timeAgo = '';
                if (diffDays > 0) {
                    timeAgo = diffDays === 1 ? t('home.activity.yesterday') : `${diffDays} ${t('home.activity.days_ago')}`;
                } else if (diffHours > 0) {
                    timeAgo = `${diffHours}h`;
                } else {
                    timeAgo = t('home.activity.just_now');
                }

                const status = q.estado || q.status;
                activities.push({
                    title: `Q&A ${status} - ${q.proveedor || q.provider_name}`,
                    desc: (q.pregunta_texto || q.question || '').substring(0, 60) + '...',
                    time: timeAgo,
                    type: status === 'Resolved' ? 'success' : 'info',
                    timestamp: date.getTime()
                });
            });
        }

        // Sort by timestamp descending and take the 5 most recent
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
    }, [tableData, proposalEvaluations, notifications, questions, t]);

    const [rfqCount, setRfqCount] = useState(0);
    const [evaluationTypes, setEvaluationTypes] = useState<Set<string>>(new Set());
    const [providersCount, setProvidersCount] = useState(0);

    // Fetch RFQ count and providers count from document_metadata
    useEffect(() => {
        // IMPORTANT: Immediately reset values to 0 when project changes
        // This prevents stale data from showing while new data loads
        setRfqCount(0);
        setEvaluationTypes(new Set());
        setProvidersCount(0);

        const fetchRfqCount = async () => {
            if (supabase) {
                // If no project selected, keep zeros
                if (!activeProjectId) {
                    return;
                }

                try {
                    const { data: rfqDocuments, error: rfqError } = await supabase
                        .from('document_metadata')
                        .select('id, title, evaluation_types, provider, created_at')
                        .eq('document_type', 'RFQ')
                        .eq('project_id', activeProjectId);


                    if (!rfqError && rfqDocuments) {

                        // Collect all evaluation types and count total
                        const types = new Set<string>();
                        // Count total evaluation types across all RFQs
                        let totalEvaluationTypesCount = 0;

                        rfqDocuments.forEach((doc: any) => {
                            if (doc.evaluation_types) {
                                // Handle both string and array cases
                                if (Array.isArray(doc.evaluation_types)) {
                                    totalEvaluationTypesCount += doc.evaluation_types.length;
                                    doc.evaluation_types.forEach((type: string) => {
                                        types.add(type.trim());
                                    });
                                } else if (typeof doc.evaluation_types === 'string') {
                                    // Try to parse if it's a JSON string
                                    try {
                                        const parsed = JSON.parse(doc.evaluation_types);
                                        if (Array.isArray(parsed)) {
                                            totalEvaluationTypesCount += parsed.length;
                                            parsed.forEach((type: string) => {
                                                types.add(type.trim());
                                            });
                                        }
                                    } catch {
                                        // If it's not JSON, treat as single type
                                        totalEvaluationTypesCount += 1;
                                        types.add(doc.evaluation_types.trim());
                                    }
                                }
                            }
                        });


                        // Set rfqCount to the number of unique RFQ documents (by title)
                        const uniqueTitles = new Set(rfqDocuments.map((doc: any) => doc.title));
                        setRfqCount(uniqueTitles.size);
                        setEvaluationTypes(types);
                    } else {
                    }
                } catch (err) {
                    console.warn('Error fetching RFQ documents from metadata:', err);
                }
            } else {
                console.warn('Supabase client not available');
            }
        };

        // Fetch unique providers from PROPOSAL documents (offers received)
        const fetchProvidersCount = async () => {
            if (supabase) {
                // If no project selected, keep zeros (already reset at top of useEffect)
                if (!activeProjectId) {
                    return;
                }

                try {
                    const { data: proposals, error: proposalError } = await supabase
                        .from('document_metadata')
                        .select('provider')
                        .eq('document_type', 'PROPOSAL')
                        .eq('project_id', activeProjectId)
                        .not('provider', 'is', null);

                    if (!proposalError && proposals) {
                        // Get unique providers
                        const uniqueProviders = new Set<string>();
                        proposals.forEach((doc: any) => {
                            if (doc.provider && doc.provider.trim()) {
                                uniqueProviders.add(doc.provider.trim());
                            }
                        });

                        setProvidersCount(uniqueProviders.size);
                    } else {
                    }
                } catch (err) {
                    console.warn('Error fetching providers from proposals:', err);
                }
            }
        };

        fetchRfqCount();
        fetchProvidersCount();
    }, [activeProjectId]);

    // Fallback: set rfqCount from tableData when Supabase returned 0
    useEffect(() => {
        if (rfqCount === 0 && tableData && tableData.length > 0) {
            const types = new Set<string>();
            tableData.forEach((item: any) => {
                if (item.evaluation_type) {
                    types.add(item.evaluation_type.trim());
                }
            });
            if (types.size > 0) {
                setRfqCount(types.size);
                if (evaluationTypes.size === 0) {
                    setEvaluationTypes(types);
                }
            }
        }
    }, [rfqCount, tableData, evaluationTypes.size]);

    // Calculate metrics from both tableData and proposalEvaluations
    const calculatedMetrics = useMemo(() => {
        const uniqueProjects = new Set<string>();
        let updatedToday = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Count items updated today
        if (tableData && tableData.length > 0) {
            tableData.forEach((item: any) => {
                if (item.created_at || item.updated_at) {
                    const itemDate = new Date(item.updated_at || item.created_at);
                    itemDate.setHours(0, 0, 0, 0);
                    if (itemDate.getTime() === today.getTime()) {
                        updatedToday++;
                    }
                }
            });
        }

        // Count from proposal evaluations
        let proposalCount = 0;
        if (proposalEvaluations && proposalEvaluations.length > 0) {
            proposalEvaluations.forEach((item: any) => {
                if (item.project_name) {
                    uniqueProjects.add(item.project_name);
                }

                // Count evaluations updated today
                if (item.updated_at) {
                    const itemDate = new Date(item.updated_at);
                    itemDate.setHours(0, 0, 0, 0);
                    if (itemDate.getTime() === today.getTime()) {
                        updatedToday++;
                    }
                }
            });
            proposalCount = proposalEvaluations.length;
        }

        return {
            totalItems: (tableData?.length || 0) + proposalCount,
            totalProjects: uniqueProjects.size,
            totalEvaluations: rfqCount,
            updatedToday
        };
    }, [tableData, proposalEvaluations, rfqCount]);

    const dashboardMetrics = {
        totalProcessed: totalProposals,
        activeRfqs: calculatedMetrics.totalEvaluations,
        providers: Object.keys(providerEvaluations).filter(p =>
            Object.values(providerEvaluations[p] || {}).some(count => count > 0)
        )
    };

    // Calculate average score from scoring results
    const avgScore = useMemo(() => {
        if (!scoringResults?.ranking || scoringResults.ranking.length === 0) return 0;
        const sum = scoringResults.ranking.reduce((acc, r) => acc + (r.overall_score || 0), 0);
        return sum / scoringResults.ranking.length;
    }, [scoringResults]);

    // Dynamic category weights from scoring config (fallback to defaults)
    const categoryWeights = useMemo(() => {
        const defaults = [
            { key: 'technical', label: t('home.scoring.technical'), weight: 30, color: '#12b5b0' },
            { key: 'economic', label: t('home.scoring.economic'), weight: 35, color: '#f59e0b' },
            { key: 'execution', label: t('home.scoring.execution'), weight: 20, color: '#3b82f6' },
            { key: 'hse', label: t('home.scoring.hse'), weight: 15, color: '#8b5cf6' }
        ];
        if (!scoringCategories || scoringCategories.length === 0) return defaults;

        const scoreKeyMap: Record<string, string> = {
            'technical': 'technical',
            'economic': 'economic',
            'execution': 'execution',
            'hse': 'hse',
            'hse_esg': 'hse',
            'hse_compliance': 'hse'
        };

        return scoringCategories
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((cat, i) => ({
                key: scoreKeyMap[cat.name] || cat.name,
                label: cat.display_name,
                weight: cat.weight,
                color: cat.color || defaults[i]?.color || '#64748b'
            }));
    }, [scoringCategories, t]);


    return (
        <div className="home-dashboard">

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary), #0d9488)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 32px',
                color: 'white',
                boxShadow: '0 8px 24px rgba(18, 181, 176, 0.2)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background elements */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h1 style={{ margin: '0', fontSize: '2.5rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.1)', letterSpacing: '-0.5px' }}>
                            <span style={{ color: 'white' }}>Bid</span>
                            <span style={{ color: '#1a1a1a' }}>Eval</span>
                        </h1>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            opacity: 0.9,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            marginTop: '4px'
                        }}>
                            {t('home.hero.subtitle')}
                        </div>
                    </div>
                    <p style={{ margin: '16px 0 0 0', opacity: 0.95, lineHeight: '1.6', fontSize: '1.05rem' }}>
                        {t('home.hero.desc')}
                    </p>
                    <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className="btn"
                            style={{
                                background: 'white',
                                color: 'var(--color-primary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => onNewProject ? onNewProject() : onNavigate('upload')}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            {t('setup.btn.new_project')}
                        </button>
                        <button
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                backdropFilter: 'blur(8px)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                            onClick={() => onNavigate('decision')}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {t('home.hero.btn_reports')}
                        </button>
                    </div>
                </div>
            </div>


            {/* Key Metrics Grid */}
            <div style={{ width: '100%', marginBottom: '10px' }}>
                <div className="stats-grid">
                    <DashboardCard
                        title={t('home.card.total_processed')}
                        value={dashboardMetrics.totalProcessed.toString()}
                        trend={`${proposalsGrowthPercentage >= 0 ? '+' : ''}${proposalsGrowthPercentage}% ${t('home.card.this_week')} (${proposalsThisWeek} ${t('home.card.proposals')})`}
                        isPositiveTrend={proposalsGrowthPercentage >= 0}
                        icon={
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                        }
                        color="var(--color-primary)"
                    />
                    <DashboardCard
                        title={t('home.card.rfqs_processed')}
                        value={dashboardMetrics.activeRfqs.toString()}
                        trend={`${evaluationTypes.size > 0 ? Math.round((evaluationTypes.size / 3) * 100) : 0}% ${t('home.card.coverage')}`}
                        icon={
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                        }
                        color="#f59e0b"
                    />
                    <DashboardCard
                        title={t('home.card.providers')}
                        value={providersCount.toString()}
                        trend={`${dashboardMetrics.providers.length} ${t('home.card.with_scores')}`}
                        icon={
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        }
                        color="var(--color-cyan)"
                    />
                    <DashboardCard
                        title={t('home.card.avg_score')}
                        value={avgScore > 0 ? `${avgScore.toFixed(1)}/10` : 'N/A'}
                        trend={avgScore === 0 ? t('home.card.no_scoring_yet') : avgScore < 6 ? t('home.card.below_threshold') : t('home.card.score_summary')}
                        isPositiveTrend={avgScore >= 6}
                        icon={
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        }
                        color="#10b981"
                    />
                </div>
            </div>

            {/* AI Scoring Results - from workflow */}
            {scoringResults && scoringResults.ranking.length > 0 && (() => {
                // Calculate top performer dynamically from current ranking
                const sortedByScore = [...scoringResults.ranking].sort((a, b) => b.overall_score - a.overall_score);
                const topPerformer = sortedByScore[0];

                return (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        padding: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '8px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                {t('home.scoring.top_performer')}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {topPerformer?.provider_name || 'N/A'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                {t('home.scoring.top_score')}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                {topPerformer?.overall_score?.toFixed(1) || 'N/A'}/10
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                {t('home.scoring.compliance_rate')}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
                                {(() => {
                                    const avgCompliance = scoringResults.ranking.reduce((sum, r) => sum + (r.compliance_percentage || 0), 0) / scoringResults.ranking.length;
                                    return `${avgCompliance.toFixed(0)}%`;
                                })()}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                {t('home.scoring.criteria_applied')}
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
                                {scoringCriteria.length > 0 ? scoringCriteria.length : scoringCategories.length > 0 ? scoringCategories.length : 'N/A'}
                            </div>
                        </div>
                    </div>
                );
            })()}



            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px', marginTop: '0px' }}>
                <div className="card" style={{
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.3s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t('home.scoring.title')}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {t('home.scoring.subtitle')}
                            </span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-cyan)',
                            opacity: 0.8
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-evenly',
                        height: '240px',
                        paddingBottom: '16px',
                        borderBottom: '2px solid var(--border-color)',
                        gap: `${Math.max(12, Math.min(50, 200 / (scoringResults?.ranking?.length || 1)))}px`,
                        padding: '0 16px 16px 16px'
                    }}>
                        {/* Use scoringResults from useScoringStore for accurate data - sorted by score */}
                        {scoringResults?.ranking && scoringResults.ranking.length > 0 ? (
                            [...scoringResults.ranking].sort((a, b) => {
                                const sumA = (a.scores?.technical || 0) + (a.scores?.economic || 0) + (a.scores?.execution || 0) + (a.scores?.hse_compliance || 0);
                                const sumB = (b.scores?.technical || 0) + (b.scores?.economic || 0) + (b.scores?.execution || 0) + (b.scores?.hse_compliance || 0);
                                return sumB - sumA;
                            }).map((provider) => {
                                const scores = provider.scores || {};
                                const hasData = (scores.technical || 0) + (scores.economic || 0) + (scores.execution || 0) + (scores.hse_compliance || 0) > 0;
                                if (!hasData) return null;

                                const scoreMap: Record<string, number> = {
                                    technical: scores.technical || 0,
                                    economic: scores.economic || 0,
                                    execution: scores.execution || 0,
                                    hse: scores.hse_compliance || 0
                                };
                                const evaluations = categoryWeights.map(cw => ({
                                    type: `${cw.label} (${cw.weight}%)`,
                                    score: scoreMap[cw.key] || 0,
                                    color: cw.color
                                }));

                                // Get display name from provider name
                                const displayName = getProviderDisplayName(provider.provider_name);

                                return (
                                    <StackedBar
                                        key={provider.provider_name}
                                        provider={displayName}
                                        evaluations={evaluations}
                                    />
                                );
                            })
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.9rem'
                            }}>
                                {t('home.scoring.no_data')}
                            </div>
                        )}
                    </div>

                    {/* Legend - Updated with correct percentages */}
                    <div style={{
                        marginTop: '24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        justifyContent: 'center'
                    }}>
                        {categoryWeights.map(cw => (
                            <LegendItem key={cw.key} color={cw.color} label={`${cw.label} (${cw.weight}%)`} />
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="card" style={{
                    padding: '0',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '28px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--bg-surface-alt)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t('home.activity.title')}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {t('home.activity.recent_activity')}
                            </span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-info)',
                            opacity: 0.8
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div style={{ padding: '0' }}>
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, index) => (
                                <ActivityItem
                                    key={index}
                                    title={activity.title}
                                    desc={activity.desc}
                                    time={activity.time}
                                    type={activity.type}
                                />
                            ))
                        ) : (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.9rem'
                            }}>
                                {t('home.activity.no_activity') || 'No recent activity'}
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div >
    );
};

// Sub-components for cleaner internal code
const DashboardCard = ({ title, value, trend, icon, color, isPositiveTrend = true }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);

    // Color del trend basado en si es positivo o negativo
    const trendColor = isPositiveTrend ? color : '#ef4444';

    return (
        <div
            className="stat-card widget-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isHovered ? color : 'var(--border-color)'}`,
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
            }}
        >
            {/* Subtle gradient overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
                opacity: isHovered ? 1 : 0.6,
                transition: 'opacity 0.3s',
                pointerEvents: 'none'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {title}
                        </span>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            margin: '20px 0 8px 0',
                            color: 'var(--text-primary)',
                            lineHeight: 1
                        }}>
                            {value}
                        </div>
                    </div>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        position: 'relative',
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${color}10`,
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transition: 'transform 0.3s ease'
                    }}>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                            {icon}
                        </div>
                    </div>
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    color: trendColor,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    {isPositiveTrend ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                            <polyline points="17 18 23 18 23 12"></polyline>
                        </svg>
                    )}
                    {trend}
                </div>
            </div>
        </div>
    );
};


const ActivityItem = ({ title, desc, time, type }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const colors: any = {
        success: 'var(--color-cyan)',
        warning: '#f59e0b',
        info: '#3b82f6',
        neutral: '#64748b'
    };

    const icons: any = {
        success: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        ),
        warning: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        ),
        info: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        ),
        neutral: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
        )
    };

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                padding: '18px 24px',
                display: 'flex',
                gap: '16px',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center',
                background: isHovered ? 'var(--bg-hover)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
            }}
        >
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${colors[type] || colors.neutral}20`,
                color: colors[type] || colors.neutral,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            }}>
                {icons[type] || icons.neutral}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {desc}
                </div>
            </div>
            <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                padding: '4px 8px',
                background: 'var(--bg-surface-alt)',
                borderRadius: '6px'
            }}>
                {time}
            </div>
        </div>
    );
};

const StackedBar = ({ provider, evaluations }: {
    provider: string,
    evaluations: { type: string, score: number, color: string }[]
}) => {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    // Filtrar solo evaluaciones con score > 0
    const activeEvaluations = evaluations.filter(ev => ev.score > 0);

    // Max para el height
    const maxPossible = 40;

    if (activeEvaluations.length === 0) return null;

    const hoveredEval = hoveredIdx !== null ? activeEvaluations[hoveredIdx] : null;

    return (
        <div
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                transition: 'all 0.3s',
                flex: '1 1 0',
                minWidth: '28px',
                maxWidth: '56px'
            }}
        >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Tooltip - solo muestra el tipo en hover */}
                {hoveredEval && (
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translate(-50%, -100%)',
                        backgroundColor: 'var(--bg-surface)',
                        border: `2px solid ${hoveredEval.color}`,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        zIndex: 100,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: hoveredEval.color, marginBottom: '2px' }}>
                            {hoveredEval.type}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {hoveredEval.score.toFixed(1)}/10
                        </div>
                        <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${hoveredEval.color}` }} />
                    </div>
                )}

                {/* Barra apilada */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    justifyContent: 'flex-start',
                    borderRadius: '8px 8px 0 0',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    transform: hoveredIdx !== null ? 'scaleX(1.08) translateY(-4px)' : 'scaleX(1)',
                    boxShadow: hoveredIdx !== null ? '0 8px 20px rgba(0,0,0,0.15)' : 'none'
                }}>
                    {activeEvaluations.map((ev, i) => {
                        const isTop = i === activeEvaluations.length - 1;
                        const isHovered = hoveredIdx === i;
                        return (
                            <div
                                key={i}
                                onMouseEnter={() => setHoveredIdx(i)}
                                style={{
                                    height: `${(ev.score / maxPossible) * 100}%`,
                                    background: `linear-gradient(180deg, ${ev.color} 0%, ${ev.color}dd 100%)`,
                                    transition: 'all 0.2s',
                                    borderTopLeftRadius: isTop ? '8px' : 0,
                                    borderTopRightRadius: isTop ? '8px' : 0,
                                    minHeight: '4px',
                                    opacity: hoveredIdx === null || isHovered ? 1 : 0.4
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Nombre del proveedor */}
            <span style={{
                fontSize: '0.7rem',
                color: hoveredIdx !== null ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: hoveredIdx !== null ? 600 : 500,
                textAlign: 'center',
                lineHeight: '1.1',
                transition: 'all 0.2s',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>
                {provider.length > 8 ? provider.substring(0, 7) + '.' : provider}
            </span>
        </div>
    );
};

const LegendItem = ({ color, label }: any) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        background: 'var(--bg-surface)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)'
    }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }}></div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <style>{`
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `}</style>
    </div>
);

