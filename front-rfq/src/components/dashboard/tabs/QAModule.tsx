import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useQAStore } from '../../../stores/useQAStore';
import { useMailStore } from '../../../stores/useMailStore';
import { useToastStore } from '../../../stores/useToastStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useProviderStore } from '../../../stores/useProviderStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { getProviderColor, getProviderDisplayName } from '../../../types/provider.types';
import { generateTechnicalAudit, sendQAToSupplier, SendToSupplierResponse } from '../../../services/n8n.service';
import { supabase } from '../../../lib/supabase';
import type { QAQuestion, Disciplina, EstadoPregunta, Importancia } from '../../../types/qa.types';

import { mapQAAuditToQAQuestion } from '../../../types/qa.types';
import './QAModule.css';

// Icons
const Icons = {
  Delete: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Cancel: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Approve: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Discard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Paper: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Error: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Filter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Mail: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Copy: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Link: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  BellRing: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2C2.8 3.7 2 5.7 2 8" />
      <path d="M22 8c0-2.3-.8-4.3-2-6" />
    </svg>
  )
};

export const QAModule: React.FC<{ projectId?: string }> = () => {
  const {
    questions,
    isLoading,
    isGenerating,
    statusMessage,
    error,
    filters,
    loadQuestions,
    createQuestion,
    createFollowUpQuestion,
    updateQuestion,
    deleteQuestion,
    setFilters,
    clearFilters,
    setQuestions,
    setGenerating,
    setStatusMessage,
    getGroupedByDisciplina,
    getStats,
    subscribeToChanges,
    loadRequirementDetails,
    getRequirementDetails,
    // Notifications
    notifications,
    unreadNotificationCount,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    subscribeToNotifications
  } = useQAStore();

  const { addToast } = useToastStore();
  const { addQAItem } = useMailStore();
  const { activeProjectId, getActiveProject } = useProjectStore();
  const { t } = useLanguageStore();

  // Use active project from global store
  const activeProject = getActiveProject();
  const projectId = activeProject?.display_name || '';
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [addingToDisciplina, setAddingToDisciplina] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [expandedDisciplina, setExpandedDisciplina] = useState<Disciplina | null>(null);
  const [newQuestionTexts, setNewQuestionTexts] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRequirements, setExpandedRequirements] = useState<Record<string, boolean>>({});

  // Send to Supplier state
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendToSupplierResponse | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendToProvider, setSendToProvider] = useState<string>('');
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);

  // Follow-up question modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);

  // Conversation history state (for viewing thread history in follow-ups)
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [loadedThreadHistory, setLoadedThreadHistory] = useState<Record<string, QAQuestion[]>>({});
  const [loadingThread, setLoadingThread] = useState<Record<string, boolean>>({});

  // Handle opening provider selector dropdown
  const handleOpenProviderSelector = () => {
    const providers = getProvidersWithApprovedQuestions();
    if (providers.length === 1 && !sendToProvider) {
      setSendToProvider(providers[0]);
    }
    setShowProviderSelector(!showProviderSelector);
  };

  // Toggle requirement expansion and load details if needed
  const handleToggleRequirement = async (questionId: string, requirementId: string | null | undefined) => {
    const isExpanded = expandedRequirements[questionId];

    if (!isExpanded && requirementId) {
      // Load requirement details if not in cache
      if (!getRequirementDetails(requirementId)) {
        await loadRequirementDetails(requirementId);
      }
    }

    setExpandedRequirements(prev => ({
      ...prev,
      [questionId]: !isExpanded
    }));
  };

  // Dynamic providers from store
  const { projectProviders } = useProviderStore();

  // Reload questions when activeProjectId changes (global project selector)
  useEffect(() => {
    if (activeProjectId) {
      // loadQuestions will use the global store's activeProjectId
      loadQuestions();
      subscribeToChanges();
      // Load and subscribe to notifications
      loadNotifications();
      subscribeToNotifications();
    } else {
      // Clear questions when no project selected
      setQuestions([]);
    }
  }, [activeProjectId, loadQuestions, subscribeToChanges, setQuestions, loadNotifications, subscribeToNotifications]);

  // Close dropdowns on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showProviderSelector) setShowProviderSelector(false);
      if (showFilters) setShowFilters(false);
      if (showNotifications) setShowNotifications(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showProviderSelector, showFilters, showNotifications]);

  // Excel Export - Approved Questions Only
  const handleExportExcel = async () => {
    try {
      // Import dynamic to avoid bundle bloat
      const XLSX = await import('xlsx');

      // Filter only approved questions or all? User said "las que le demos a aprobar"
      const approvedQuestions = questions.filter(q => q.estado === 'Approved');

      if (approvedQuestions.length === 0) {
        addToast('No approved questions to export. Please approve some questions first.', 'warning');
        return;
      }

      const exportData = approvedQuestions.map(q => ({
        'Project': projectId,
        'Provider': q.proveedor,
        'Discipline': q.disciplina,
        'Importance': q.importancia,
        'Question': q.pregunta_texto,
        'Created At': new Date(q.created_at).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Technical Audit');

      const fileName = `Technical_Audit_${selectedProvider || 'P2X'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addToast('Technical audit exported successfully to Excel', 'success');
    } catch (err) {
      addToast('Error exporting to Excel', 'error');
    }
  };

  // Excel Export - All Questions
  const handleExportAllQuestions = async () => {
    try {
      const XLSX = await import('xlsx');

      if (questions.length === 0) {
        addToast('No questions to export', 'warning');
        return;
      }

      const exportData = questions.map(q => {
        const response = q.respuesta_proveedor || q.response || '';
        const responseDate = q.fecha_respuesta ? new Date(q.fecha_respuesta).toLocaleDateString() : '';

        return {
          'Project': q.project_name || q.project_id || projectId,
          'Provider': q.proveedor || q.provider_name,
          'Discipline': q.disciplina || q.discipline,
          'Importance': q.importancia || q.importance,
          'Question': q.pregunta_texto || q.question,
          'Status': q.estado || q.status,
          'Supplier Response': response,
          'Response Date': responseDate,
          'Created At': new Date(q.created_at).toLocaleDateString()
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit column widths for better readability
      const colWidths = [
        { wch: 25 },  // Project
        { wch: 12 },  // Provider
        { wch: 12 },  // Discipline
        { wch: 10 },  // Importance
        { wch: 60 },  // Question
        { wch: 14 },  // Status
        { wch: 60 },  // Supplier Response
        { wch: 12 },  // Response Date
        { wch: 12 }   // Created At
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Q&A Report');

      const fileName = `QA_Report_${projectId || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addToast(`${questions.length} questions exported successfully to Excel`, 'success');
    } catch (err) {
      addToast('Error exporting to Excel', 'error');
    }
  };

  const handleGenerateAudit = async () => {
    if (!selectedProvider) {
      addToast('Please select a provider', 'warning');
      return;
    }

    // Get the actual UUID from the active project
    const projectUUID = activeProjectId || activeProject?.id;

    if (!projectUUID || !projectId) {
      addToast('No project selected. Please select a project from the header.', 'warning');
      return;
    }

    setGenerating(true);
    setStatusMessage('Analyzing deficiencies and generating technical audit questions...');

    const countBefore = useQAStore.getState().questions.length;

    try {
      const activeProj = getActiveProject();
      const result = await generateTechnicalAudit({
        project_id: projectUUID,
        project_name: projectId,
        provider: selectedProvider,
        language: activeProj?.default_language || 'es',
        currency: activeProj?.currency || 'EUR',
        project_type: (activeProj?.project_type || 'RFP') as 'RFP' | 'RFQ' | 'RFI'
      });

      if (result.success) {
        // Reload from Supabase — n8n inserts directly to DB, webhook response may not contain all items
        await loadQuestions();
        const actualCount = useQAStore.getState().questions.length - countBefore;
        const displayCount = actualCount > 0 ? actualCount : result.preguntas_generadas;

        setStatusMessage(`Success! ${displayCount} questions generated and displayed.`);
        addToast(`${displayCount} technical audit questions generated successfully`, 'success');
      } else {
        setStatusMessage(`Warning: ${result.message || 'The process finished with no results.'}`);
        addToast(result.message || 'The process finished with no results.', 'warning');
      }

      // Clear message after a longer delay
      setTimeout(() => setStatusMessage(null), 8000);
    } catch (err) {
      setStatusMessage(null);
      addToast(err instanceof Error ? err.message : 'Error generating technical audit', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManualQuestion = async (disciplina: string) => {
    const text = newQuestionTexts[disciplina]?.trim();

    // Try to get provider from: 1) selection, 2) existing questions, 3) only provider in project
    const existingProvider = questions.find(q =>
      (q.disciplina || q.discipline) === disciplina
    )?.proveedor || questions.find(q =>
      (q.disciplina || q.discipline) === disciplina
    )?.provider_name;

    const singleProjectProvider = projectProviders.length === 1 ? projectProviders[0] : null;
    const providerToUse = selectedProvider || existingProvider || singleProjectProvider;

    if (!text) {
      addToast('Please enter a question', 'warning');
      return;
    }

    if (!providerToUse) {
      addToast('Please select a provider', 'warning');
      return;
    }

    // Get the actual UUID from the active project
    const projectUUID = activeProjectId || activeProject?.id;

    if (!projectUUID || !projectId) {
      addToast('No project selected. Please select a project from the header.', 'warning');
      return;
    }

    try {
      await createQuestion({
        project_id: projectUUID,  // UUID del proyecto
        provider_name: providerToUse,
        discipline: disciplina as Disciplina,
        question: text,
        status: 'Draft',
        importance: 'Medium',
        // Alias for frontend compatibility
        proveedor: providerToUse,
        disciplina: disciplina as Disciplina,
        pregunta_texto: text,
        estado: 'Draft',
        importancia: 'Medium'
      });

      // Reset text
      setNewQuestionTexts(prev => ({ ...prev, [disciplina || '']: '' }));
      setAddingToDisciplina(null);
      addToast('Question added successfully', 'success');
    } catch (err) {
      addToast('Error adding question', 'error');
    }
  };

  const handleEditQuestion = (question: QAQuestion) => {
    setEditingQuestion(question.id);
    setEditedText(question.pregunta_texto || question.question || '');
  };

  const handleSaveQuestion = async (questionId: string) => {
    await updateQuestion(questionId, { pregunta_texto: editedText });
    setEditingQuestion(null);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedText('');
  };

  const handleUpdateStatus = async (questionId: string, estado: EstadoPregunta, event?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation to avoid scroll jumps
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Save scroll position before update
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    await updateQuestion(questionId, { estado });

    // Restore scroll position after state update to prevent jump
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
    });

    // When approving, add the question to the Mail store for inclusion in emails
    if (estado === 'Approved') {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        addQAItem(question);
        addToast('Question approved and added to Mail queue', 'success');
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion(questionId);
    }
  };

  // Open follow-up question modal
  const handleOpenFollowUp = (questionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setFollowUpParentId(questionId);
    setFollowUpText('');
    setShowFollowUpModal(true);
  };

  // Submit follow-up question
  const handleSubmitFollowUp = async () => {
    if (!followUpParentId || !followUpText.trim()) return;

    setIsCreatingFollowUp(true);
    try {
      await createFollowUpQuestion(followUpParentId, followUpText.trim());
      addToast(t('qa.thread.created_draft'), 'success');
      setShowFollowUpModal(false);
      setFollowUpParentId(null);
      setFollowUpText('');
    } catch (error) {
      addToast('Error creating follow-up question', 'error');
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  // Get parent question for display in modal
  const getParentQuestion = (parentId: string | null) => {
    if (!parentId) return null;
    return questions.find(q => q.id === parentId);
  };

  // Get follow-up questions for a parent question
  // Uses raw questions from store directly to ensure we find follow-ups even when filtering
  const getFollowUpQuestions = (parentId: string) => {
    const allQuestions = useQAStore.getState().questions;
    return allQuestions.filter(q => q.parent_question_id === parentId);
  };

  // Check if a question has follow-ups
  // Uses raw questions from store directly to ensure we find follow-ups even when filtering
  const hasFollowUps = (questionId: string) => {
    const allQuestions = useQAStore.getState().questions;
    return allQuestions.some(q => q.parent_question_id === questionId);
  };

  // Get full conversation thread (all ancestors from a question to the root)
  // Uses raw questions from store directly to ensure we find parents even when filtering
  const getConversationThread = (questionId: string): QAQuestion[] => {
    // Access raw questions directly from store to avoid filtering issues
    const allQuestions = useQAStore.getState().questions;
    const thread: QAQuestion[] = [];
    let currentQuestion = allQuestions.find(q => q.id === questionId);

    while (currentQuestion?.parent_question_id) {
      const parent = allQuestions.find(q => q.id === currentQuestion!.parent_question_id);
      if (parent) {
        thread.unshift(parent);
        currentQuestion = parent;
      } else {
        break;
      }
    }

    return thread;
  };

  // Load thread history from Supabase
  const loadThreadHistory = async (questionId: string, parentQuestionId: string) => {
    if (loadedThreadHistory[questionId] || loadingThread[questionId]) return;

    setLoadingThread(prev => ({ ...prev, [questionId]: true }));

    try {
      const thread: QAQuestion[] = [];
      let currentParentId: string | null = parentQuestionId;

      // Walk up the chain of parent questions
      while (currentParentId) {
        const { data, error } = await (supabase!
          .from('qa_audit') as any)
          .select('*')
          .eq('id', currentParentId)
          .single();

        if (error || !data) break;

        const mappedQuestion = mapQAAuditToQAQuestion(data);
        thread.unshift(mappedQuestion);
        currentParentId = data.parent_question_id as string | null;
      }

      setLoadedThreadHistory(prev => ({ ...prev, [questionId]: thread }));
    } catch (error) {
      // ignored
    } finally {
      setLoadingThread(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Toggle conversation history expansion
  const toggleHistoryExpansion = async (questionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const isExpanding = !expandedHistory[questionId];
    setExpandedHistory(prev => ({
      ...prev,
      [questionId]: isExpanding
    }));

    // Load thread history when expanding if not already loaded
    if (isExpanding) {
      const question = useQAStore.getState().questions.find(q => q.id === questionId);
      if (question?.parent_question_id && !loadedThreadHistory[questionId]) {
        await loadThreadHistory(questionId, question.parent_question_id);
      }
    }
  };

  // Send approved questions to supplier
  const handleSendToSupplier = async () => {
    if (!sendToProvider) {
      addToast('Please select a provider to send questions to.', 'warning');
      return;
    }

    // Filter approved questions for the selected provider
    const approvedQuestions = questions.filter(q =>
      (q.estado || q.status) === 'Approved' &&
      (q.proveedor || q.provider_name) === sendToProvider
    );

    if (approvedQuestions.length === 0) {
      addToast(`No approved questions for ${sendToProvider}. Please approve some questions first.`, 'warning');
      return;
    }

    const projectUUID = activeProjectId || activeProject?.id;
    if (!projectUUID) {
      addToast('Could not determine project ID. Please reselect the project.', 'warning');
      return;
    }

    setIsSending(true);

    try {
      const result = await sendQAToSupplier({
        project_id: projectUUID,
        provider_name: sendToProvider,
        question_ids: approvedQuestions.map(q => q.id),
        expires_days: 7
      });

      setSendResult(result);
      setShowSendModal(true);

      // Update question statuses to 'Sent'
      for (const q of approvedQuestions) {
        await updateQuestion(q.id, { estado: 'Sent' });
      }

      addToast(`${approvedQuestions.length} questions sent to ${sendToProvider}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error sending questions to supplier', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Get providers with approved questions
  const getProvidersWithApprovedQuestions = () => {
    const providers = new Set<string>();
    questions.forEach(q => {
      if ((q.estado || q.status) === 'Approved') {
        const provider = q.proveedor || q.provider_name;
        if (provider) providers.add(provider);
      }
    });
    return Array.from(providers);
  };

  // Copy link to clipboard (with fallback for HTTP)
  const handleCopyLink = async () => {
    if (sendResult?.response_link) {
      try {
        // Try modern clipboard API first (requires HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(sendResult.response_link);
        } else {
          // Fallback for HTTP: use textarea + execCommand
          const textArea = document.createElement('textarea');
          textArea.value = sendResult.response_link;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        addToast('Link copied to clipboard', 'success');
      } catch (err) {
        addToast('Failed to copy link. Please copy manually.', 'error');
      }
    }
  };

  const getImportanciaClass = (importancia?: Importancia | null) => {
    switch (importancia) {
      case 'High': return 'importancia-alta';
      case 'Medium': return 'importancia-media';
      case 'Low': return 'importancia-baja';
      default: return '';
    }
  };

  const getEstadoClass = (estado: EstadoPregunta) => {
    switch (estado) {
      case 'Draft': return 'estado-borrador';
      case 'Pending': return 'estado-pendiente';
      case 'Approved': return 'estado-aprobada';
      case 'Sent': return 'estado-enviada';
      case 'Answered': return 'estado-respondida';
      case 'Resolved': return 'estado-resuelta';
      case 'NeedsMoreInfo': return 'estado-necesita-info';
      case 'Discarded': return 'estado-descartada';
      default: return '';
    }
  };

  const getProviderStyle = (provider?: string | null) => {
    if (!provider) return {};
    const color = getProviderColor(provider, projectProviders);
    return { backgroundColor: `${color}20`, color: color, borderColor: `${color}40` };
  };

  const groupedQuestions = getGroupedByDisciplina();
  const stats = getStats();

  // Discipline name mapping - uses translations (handles various cases)
  const getDisciplineLabel = (discipline: string): string => {
    const normalized = discipline?.toLowerCase() || '';
    const disciplineMap: Record<string, string> = {
      'electrical': t('discipline.electrical'),
      'mechanical': t('discipline.mechanical'),
      'civil': t('discipline.civil'),
      'process': t('discipline.process'),
      'general': t('discipline.general'),
      'cost': t('discipline.cost')
    };
    return disciplineMap[normalized] || discipline;
  };

  // Status translation mapping (handles various cases)
  const getStatusLabel = (status: string): string => {
    const normalized = status?.toLowerCase() || '';
    const statusMap: Record<string, string> = {
      'draft': t('status.draft'),
      'pending': t('status.pending'),
      'approved': t('status.approved'),
      'sent': t('status.sent'),
      'answered': t('status.answered'),
      'resolved': t('status.resolved'),
      'needsmoreinfo': t('status.needs_more_info'),
      'discarded': t('status.discarded')
    };
    return statusMap[normalized] || status;
  };

  // Priority/Importance translation mapping (handles various cases)
  const getPriorityLabel = (priority: string): string => {
    if (!priority) return '';

    // Remove "PRIORITY." prefix if present (case-insensitive)
    let cleaned = priority.replace(/^priority\./i, '').toLowerCase();

    const priorityMap: Record<string, string> = {
      'high': t('priority.high'),
      'medium': t('priority.medium'),
      'low': t('priority.low'),
      'alta': t('priority.high'),
      'media': t('priority.medium'),
      'baja': t('priority.low')
    };
    return priorityMap[cleaned] || priority;
  };

  return (
    <div className="module-container">
      {/* Main Header */}
      <div className="module-main-header">
        <h1 className="module-main-title">{t('qa.title')}</h1>
        <p className="module-main-subtitle">
          {t('qa.subtitle')}
        </p>
      </div>

      {/* SECTION 1: TECHNICAL AUDIT GENERATOR */}
      <div className="module-section audit-generator-section">
        <div className="module-section-header">
          <div className="module-section-header-content">
            <Icons.Paper />
            <div>
              <h2 className="module-section-title">{t('qa.generator.title')}</h2>
              <p className="module-section-subtitle">{t('qa.generator.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="generator-form module-card">
          <div className="generator-inline">
            <label className="form-label">{t('qa.generator.provider')}</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="qa-select"
            >
              <option value="">{t('qa.generator.select_provider')}</option>
              {projectProviders.map(p => (
                <option key={p} value={p}>{getProviderDisplayName(p)}</option>
              ))}
            </select>

            <button
              onClick={handleGenerateAudit}
              disabled={isGenerating || !selectedProvider}
              className="module-btn-primary"
            >
              {isGenerating ? (
                <>
                  <span className="module-spinner"></span>
                  {t('qa.generator.btn_generating')}
                </>
              ) : (
                t('qa.generator.btn_generate')
              )}
            </button>

            {questions.some(q => q.estado === 'Approved') && (
              <button
                onClick={handleExportExcel}
                className="module-btn-secondary"
                title={t('qa.generator.btn_export')}
              >
                <Icons.Download />
                {t('qa.generator.btn_export')}
              </button>
            )}
          </div>

          {statusMessage && (
            <div className={`module-status-banner ${statusMessage.includes('Success') || statusMessage.includes('completed') ? 'success' : ''}`}>
              {isGenerating && <span className="module-spinner"></span>}
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: QUESTIONS VIEWER & MANAGEMENT */}
      <div className="module-section questions-viewer-section">
        <div className="module-section-header">
          <div className="module-section-header-content">
            <div>
              <h2 className="module-section-title">{t('qa.questions.title')}</h2>
              <p className="module-section-subtitle">{t('qa.questions.subtitle')}</p>
            </div>
          </div>

          <div className="module-section-header-actions">
            {/* Notifications Button */}
            <div className="notifications-wrapper">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`notification-btn ${unreadNotificationCount > 0 ? 'has-unread' : ''}`}
                title={`${unreadNotificationCount} ${t('notifications.title').toLowerCase()}`}
              >
                {unreadNotificationCount > 0 ? <Icons.BellRing /> : <Icons.Bell />}
                {unreadNotificationCount > 0 && (
                  <span className="notification-badge">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>
                )}
              </button>

              {/* Notifications Panel */}
              {showNotifications && (
                <>
                  <div className="dropdown-overlay" onClick={() => setShowNotifications(false)} />
                  <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="notifications-header">
                      <h4>{t('notifications.title')}</h4>
                      {unreadNotificationCount > 0 && (
                        <button
                          className="mark-all-read-btn"
                          onClick={() => {
                            markAllNotificationsRead();
                          }}
                        >
                          {t('notifications.markAllRead')}
                        </button>
                      )}
                      <button
                        className="close-btn"
                        onClick={() => setShowNotifications(false)}
                      >
                        <Icons.Cancel />
                      </button>
                    </div>
                    <div className="notifications-list">
                      {notifications.length === 0 ? (
                        <div className="notifications-empty">
                          <Icons.Bell />
                          <p>{t('notifications.empty')}</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => {
                              if (!notification.is_read) {
                                markNotificationRead(notification.id);
                              }
                              // Optionally refresh questions to show updated status
                              loadQuestions();
                            }}
                          >
                            <div className="notification-icon">
                              {notification.notification_type === 'supplier_responded' && <Icons.Check />}
                              {notification.notification_type === 'evaluation_updated' && <Icons.Edit />}
                              {notification.notification_type === 'questions_sent' && <Icons.Send />}
                            </div>
                            <div className="notification-content">
                              <div className="notification-title">{notification.title}</div>
                              {notification.message && (
                                <div className="notification-message">{notification.message}</div>
                              )}
                              <div className="notification-time">
                                {new Date(notification.created_at).toLocaleString()}
                              </div>
                            </div>
                            {!notification.is_read && <div className="unread-dot" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Send to Supplier Button */}
            {getProvidersWithApprovedQuestions().length > 0 && (
              <div className="send-to-supplier-wrapper">
                <button
                  onClick={handleOpenProviderSelector}
                  disabled={isSending}
                  className="module-btn-primary"
                  title={t('qa.questions.btn_send')}
                >
                  {isSending ? (
                    <>
                      <span className="module-spinner"></span>
                      {t('qa.questions.btn_sending')}
                    </>
                  ) : (
                    <>
                      <Icons.Mail />
                      {t('qa.questions.btn_send')}
                    </>
                  )}
                </button>

                {/* Provider Selector Popup */}
                {showProviderSelector && (
                  <>
                    <div className="dropdown-overlay" onClick={() => setShowProviderSelector(false)} />
                    <div
                      className="provider-selector-popup"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="provider-selector-header">
                        <h4>{t('qa.modal.select_provider')}</h4>
                        <button
                          className="close-btn"
                          onClick={() => setShowProviderSelector(false)}
                        >
                          <Icons.Cancel />
                        </button>
                      </div>
                      <div className="provider-selector-list">
                        {getProvidersWithApprovedQuestions().map(provider => {
                          const count = questions.filter(q =>
                            (q.estado || q.status) === 'Approved' &&
                            (q.proveedor || q.provider_name) === provider
                          ).length;
                          return (
                            <button
                              key={provider}
                              className={`provider-option ${sendToProvider === provider ? 'selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSendToProvider(provider);
                              }}
                            >
                              <span className="provider-name">{provider}</span>
                              <span className="provider-count">{count} {t('common.questions')}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="provider-selector-footer">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (sendToProvider) {
                              setShowProviderSelector(false);
                              handleSendToSupplier();
                            }
                          }}
                          disabled={!sendToProvider}
                          className="btn btnPrimary"
                        >
                          <Icons.Send /> {t('qa.modal.send_questions')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Export All Questions Button */}
            {questions.length > 0 && (
              <button
                onClick={handleExportAllQuestions}
                className="module-btn-primary"
                title={t('qa.questions.btn_export_all')}
              >
                <Icons.Download />
                {t('qa.questions.btn_export_all')}
              </button>
            )}

            {/* Filters Toggle Button */}
            <div className="qa-filters-wrapper">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btnSecondary qa-filter-toggle-btn ${showFilters ? 'active' : ''}`}
              >
                <Icons.Filter />
                {t('qa.questions.btn_filters')}
                {Object.values(filters).some(v => v !== null) && <span className="filter-dot" />}
              </button>

              {showFilters && (
                <>
                  <div className="dropdown-overlay" onClick={() => setShowFilters(false)} />
                  <div className="qa-filters-menu card">
                    <div className="filter-menu-header">
                      <h4>{t('qa.filters.title')}</h4>
                      <button onClick={clearFilters} className="text-btn btn-sm">{t('qa.filters.clear')}</button>
                    </div>

                    <div className="filter-group">
                      <label>{t('qa.filters.provider')}</label>
                      <select
                        value={filters.proveedor || ''}
                        onChange={(e) => setFilters({ proveedor: e.target.value || null })}
                        className="filter-select"
                      >
                        <option value="">{t('qa.filters.all_providers')}</option>
                        {projectProviders.map(p => (
                          <option key={p} value={p}>{getProviderDisplayName(p)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>{t('qa.filters.status')}</label>
                      <select
                        value={filters.estado || ''}
                        onChange={(e) => setFilters({ estado: e.target.value as EstadoPregunta || null })}
                        className="filter-select"
                      >
                        <option value="">{t('qa.filters.all_statuses')}</option>
                        <option value="Draft">{t('status.draft')}</option>
                        <option value="Pending">{t('status.pending')}</option>
                        <option value="Approved">{t('status.approved')}</option>
                        <option value="Sent">{t('status.sent')}</option>
                        <option value="Answered">{t('status.answered')}</option>
                        <option value="Resolved">{t('status.resolved')}</option>
                        <option value="NeedsMoreInfo">{t('status.needs_more_info')}</option>
                        <option value="Discarded">{t('status.discarded')}</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>{t('qa.filters.importance')}</label>
                      <select
                        value={filters.importancia || ''}
                        onChange={(e) => setFilters({ importancia: e.target.value as Importancia || null })}
                        className="filter-select"
                      >
                        <option value="">{t('qa.filters.all_importances')}</option>
                        <option value="High">{t('importance.high')}</option>
                        <option value="Medium">{t('importance.medium')}</option>
                        <option value="Low">{t('importance.low')}</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Statistics */}
        {stats.total > 0 && (
          <div className="module-stats-grid">
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.total}</div>
              <div className="module-stat-label">{t('qa.questions.total')}</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porEstado['Approved'] || 0}</div>
              <div className="module-stat-label">{t('qa.questions.approved')}</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porEstado['Pending'] || 0}</div>
              <div className="module-stat-label">{t('qa.questions.pending')}</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porImportancia?.['High'] || 0}</div>
              <div className="module-stat-label">{t('qa.questions.high_importance')}</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {
          error && (
            <div className="qa-error">
              <Icons.Error /> {t(error)}
              {error.includes('qa.error.table_not_found') && (
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  Please run the setup_qa_table.sql script in Supabase
                </div>
              )}
            </div>
          )
        }

        {/* Loading State */}
        {
          isLoading && (
            <div className="qa-loading">
              <span className="spinner"></span>
              Loading questions...
            </div>
          )
        }

        {/* Disciplines View */}
        <div className="qa-disciplinas-container">
          {groupedQuestions.map((group) => (
          <div key={group.disciplina} className="disciplina-group card">
            {/* Discipline Header */}
            <div
              className="disciplina-header"
              onClick={() => setExpandedDisciplina(
                expandedDisciplina === group.disciplina ? null : group.disciplina
              )}
            >
              <div className="disciplina-info">
                <h3 className="disciplina-name">{getDisciplineLabel(group.disciplina)}</h3>
                <div className="disciplina-badges">
                  <span className="badge badge-total">{group.stats.total} {t('common.questions')}</span>
                  {group.stats.borradores > 0 && (
                    <span className="badge badge-borrador">{group.stats.borradores} {t('common.drafts')}</span>
                  )}
                  {group.stats.aprobadas > 0 && (
                    <span className="badge badge-aprobada">{group.stats.aprobadas} {t('status.approved').toLowerCase()}</span>
                  )}
                  {group.stats.alta > 0 && (
                    <span className="badge badge-alta">{group.stats.alta} {t('common.high')}</span>
                  )}
                </div>
              </div>
              <div className="disciplina-toggle">
                {expandedDisciplina === group.disciplina ? '▼' : '▶'}
              </div>
            </div>

            {/* Question List (Expandable) */}
            {expandedDisciplina === group.disciplina && (
              <div className="preguntas-list">
                {/* Show all questions - follow-ups will have thread view */}
                {group.preguntas.map((question) => (
                  <div key={question.id} className={`question-thread ${hasFollowUps(question.id) ? 'has-thread' : ''} ${question.parent_question_id ? 'is-follow-up' : ''}`}>
                  <div className={`question-card ${question.parent_question_id ? 'follow-up-standalone' : ''}`}>
                    {/* Question Header */}
                    <div className="question-header">
                      <div className="question-meta">
                        {/* Question type badge: ORIGINAL or FOLLOW-UP */}
                        <span className={`badge ${question.parent_question_id ? 'badge-followup' : 'badge-original'}`}>
                          {question.parent_question_id ? t('qa.thread.follow_up_label') : t('qa.badge.original')}
                        </span>
                        <span className={`badge ${getEstadoClass(question.estado || question.status)}`}>
                          {getStatusLabel(question.estado || question.status || '')}
                        </span>
                        {(question.importancia || question.importance) && (
                          <span className={`badge ${getImportanciaClass(question.importancia || question.importance)}`}>
                            {getPriorityLabel(question.importancia || question.importance || '')}
                          </span>
                        )}
                        <span className="question-provider" style={getProviderStyle(question.proveedor || question.provider_name)}>
                          {getProviderDisplayName(question.proveedor || question.provider_name)}
                        </span>
                        {/* Thread View Button - for questions that are follow-ups */}
                        {question.parent_question_id && (
                          <button
                            className={`badge-btn thread-toggle-btn ${expandedHistory[question.id] ? 'active' : ''}`}
                            onClick={(e) => toggleHistoryExpansion(question.id, e)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {expandedHistory[question.id] ? t('qa.thread.hide_history') : t('qa.thread.view_thread')}
                          </button>
                        )}
                      </div>
                      <div className="question-actions-top">
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="icon-btn icon-btn-danger"
                          title={t('qa.confirm.delete')}
                        >
                          <Icons.Delete />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Conversation History for main cards */}
                    {expandedHistory[question.id] && question.parent_question_id && (
                      <div className="conversation-thread-view">
                        {loadingThread[question.id] ? (
                          <div className="thread-loading">
                            <span className="spinner-small"></span>
                            {t('common.loading')}
                          </div>
                        ) : (loadedThreadHistory[question.id] || []).length > 0 ? (
                          <>
                            <div className="thread-timeline">
                              {(loadedThreadHistory[question.id] || []).map((historyItem, index) => (
                                <div key={historyItem.id} className="thread-exchange">
                                  <div className="thread-step-indicator">
                                    <span className="step-number">{index + 1}</span>
                                    <span className="step-line"></span>
                                  </div>
                                  <div className="thread-content">
                                    <div className="thread-question-box">
                                      <div className="thread-box-header">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <circle cx="12" cy="12" r="10" />
                                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                          <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>{t('qa.thread.previous_question')}</span>
                                      </div>
                                      <p>{historyItem.question || historyItem.pregunta_texto}</p>
                                    </div>
                                    <div className="thread-response-box">
                                      <div className="thread-box-header">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                        </svg>
                                        <span>{t('qa.thread.previous_response')}</span>
                                      </div>
                                      <p>{historyItem.response || historyItem.respuesta_proveedor || t('qa.thread.no_response_yet')}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="thread-current-indicator">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                              <span>{t('qa.thread.current_question')}</span>
                            </div>
                          </>
                        ) : (
                          <div className="thread-empty">
                            {t('qa.thread.no_history')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Content */}
                    <div className="question-body">
                      {editingQuestion === question.id ? (
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="question-edit-textarea"
                          rows={4}
                        />
                      ) : (
                        <p className="question-text">{question.pregunta_texto || question.question}</p>
                      )}
                    </div>

                    {/* Requirement Origin - Expandable Section */}
                    {question.requirement_id && (
                      <div className="requirement-origin">
                        <button
                          type="button"
                          className="requirement-toggle"
                          onClick={() => handleToggleRequirement(question.id, question.requirement_id)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`toggle-icon ${expandedRequirements[question.id] ? 'expanded' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                          <span>{t('qa.questions.view_source')}</span>
                        </button>

                        {expandedRequirements[question.id] && (
                          <div className="requirement-details">
                            {(() => {
                              const req = getRequirementDetails(question.requirement_id || '');
                              if (!req) {
                                return (
                                  <div className="requirement-loading">
                                    <span className="spinner"></span> {t('qa.questions.loading_req')}
                                  </div>
                                );
                              }
                              return (
                                <>
                                  <div className="requirement-item">
                                    <strong>{t('clarification.table.req')}:</strong>
                                    <p>{req.requirement_text}</p>
                                  </div>
                                  <div className="requirement-meta">
                                    <span className="badge badge-secondary">
                                      {req.evaluation_type}
                                    </span>
                                    {req.phase && (
                                      <span className="badge badge-secondary">
                                        {req.phase}
                                      </span>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Provider Response */}
                    {(question.respuesta_proveedor || question.response) && (
                      <div className="question-response">
                        <strong>{t('qa.question.response')}</strong>
                        <p>{question.respuesta_proveedor || question.response}</p>
                        <small>{t('qa.question.answered_on')} {new Date(question.fecha_respuesta || '').toLocaleDateString()}</small>
                      </div>
                    )}

                    {/* Internal Notes */}
                    {question.notas_internas && (
                      <div className="question-notes">
                        <strong>{t('qa.question.internal_notes')}</strong>
                        <p>{question.notas_internas}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="question-actions">
                      {editingQuestion === question.id ? (
                        <>
                          <button
                            onClick={() => handleSaveQuestion(question.id)}
                            className="btn btnPrimary btn-sm"
                          >
                            <Icons.Save /> {t('qa.btn.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btnSecondary btn-sm"
                          >
                            <Icons.Cancel /> {t('qa.btn.cancel')}
                          </button>
                        </>
                      ) : (() => {
                        const rawStatus = question.estado || question.status || 'Draft';
                        // Normalize status to handle both English and Spanish values
                        const normalizeStatus = (s: string): string => {
                          const upper = s.toUpperCase();
                          if (['DRAFT', 'BORRADOR'].includes(upper)) return 'Draft';
                          if (['PENDING', 'PENDIENTE'].includes(upper)) return 'Pending';
                          if (['APPROVED', 'APROBADO', 'APROBADA'].includes(upper)) return 'Approved';
                          if (['SENT', 'ENVIADO', 'ENVIADA'].includes(upper)) return 'Sent';
                          if (['ANSWERED', 'RESPONDIDO', 'RESPONDIDA'].includes(upper)) return 'Answered';
                          if (['RESOLVED', 'RESUELTO', 'RESUELTA'].includes(upper)) return 'Resolved';
                          if (['NEEDSMOREINFO', 'NEEDS_MORE_INFO', 'NECESITA_MAS_INFO'].includes(upper)) return 'NeedsMoreInfo';
                          if (['DISCARDED', 'DESCARTADO', 'DESCARTADA'].includes(upper)) return 'Discarded';
                          return s;
                        };
                        const currentStatus = normalizeStatus(rawStatus);
                        return (
                          <>
                            {/* Show Edit/Approve/Discard for Draft or Pending status */}
                            {(currentStatus === 'Draft' || currentStatus === 'Pending') && (
                              <>
                                <button
                                  onClick={() => handleEditQuestion(question)}
                                  className="btn btnSecondary btn-sm"
                                >
                                  <Icons.Edit /> {t('qa.btn.edit')}
                                </button>
                                <button
                                  onClick={(e) => handleUpdateStatus(question.id, 'Approved', e)}
                                  className="btn btnPrimary btn-sm"
                                >
                                  <Icons.Approve /> {t('qa.btn.approve')}
                                </button>
                                <button
                                  onClick={(e) => handleUpdateStatus(question.id, 'Discarded', e)}
                                  className="btn btnDanger btn-sm"
                                >
                                  <Icons.Discard /> {t('qa.btn.discard')}
                                </button>
                              </>
                            )}
                            {currentStatus === 'Approved' && (
                              <button
                                onClick={(e) => handleUpdateStatus(question.id, 'Sent', e)}
                                className="btn btnPrimary btn-sm"
                              >
                                <Icons.Send /> {t('qa.btn.send')}
                              </button>
                            )}
                            {currentStatus === 'Sent' && (
                              <span className="status-message">
                                {t('qa.status.waiting')}
                              </span>
                            )}
                            {currentStatus === 'Answered' && (
                              <>
                                <span className="status-message success" style={{ marginRight: '12px' }}>
                                  {t('qa.status.review_needed')}
                                </span>
                                <button
                                  onClick={(e) => handleUpdateStatus(question.id, 'Resolved', e)}
                                  className="btn btnSuccess btn-sm"
                                  title={t('qa.btn.accept_response')}
                                >
                                  <Icons.Approve /> {t('qa.btn.accept_response')}
                                </button>
                                <button
                                  onClick={(e) => handleOpenFollowUp(question.id, e)}
                                  className="btn btnWarning btn-sm"
                                  title={t('qa.btn.need_more_info')}
                                >
                                  <Icons.Edit /> {t('qa.btn.need_more_info')}
                                </button>
                              </>
                            )}
                            {currentStatus === 'Resolved' && (
                              <span className="status-message resolved">
                                {t('qa.status.resolved')}
                              </span>
                            )}
                            {currentStatus === 'NeedsMoreInfo' && (
                              <>
                                <span className="status-message warning" style={{ marginRight: '12px' }}>
                                  {t('qa.status.more_info')}
                                </span>
                                <button
                                  onClick={(e) => handleUpdateStatus(question.id, 'Resolved', e)}
                                  className="btn btnSuccess btn-sm"
                                  title={t('qa.btn.mark_resolved')}
                                >
                                  <Icons.Approve /> {t('qa.btn.mark_resolved')}
                                </button>
                              </>
                            )}
                            {currentStatus === 'Discarded' && (
                              <span className="status-message" style={{ color: 'var(--color-error, #ef4444)' }}>
                                {t('qa.status.discarded')}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Follow-up questions (thread) */}
                  {getFollowUpQuestions(question.id).length > 0 && (
                    <div className="follow-up-questions">
                      {getFollowUpQuestions(question.id).map((followUp) => (
                        <div key={followUp.id} className="question-card follow-up-card">
                          <div className="question-header">
                            <div className="question-meta">
                              <span className="follow-up-badge">{t('qa.thread.follow_up_label')}</span>
                              <span className={`badge ${getEstadoClass(followUp.estado || followUp.status)}`}>
                                {getStatusLabel(followUp.estado || followUp.status || '')}
                              </span>
                              {/* View Thread Button - next to badges */}
                              {followUp.parent_question_id && getConversationThread(followUp.id).length > 0 && (
                                <button
                                  className={`badge-btn thread-toggle-btn ${expandedHistory[followUp.id] ? 'active' : ''}`}
                                  onClick={(e) => toggleHistoryExpansion(followUp.id, e)}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  {expandedHistory[followUp.id] ? t('qa.thread.hide_history') : t('qa.thread.view_thread')}
                                  <span className="thread-count">({getConversationThread(followUp.id).length})</span>
                                </button>
                              )}
                            </div>
                            <div className="question-actions-top">
                              <button
                                onClick={() => handleDeleteQuestion(followUp.id)}
                                className="icon-btn icon-btn-danger"
                                title={t('qa.confirm.delete')}
                              >
                                <Icons.Delete />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Conversation History */}
                          {expandedHistory[followUp.id] && followUp.parent_question_id && (
                            <div className="conversation-thread-view">
                              <div className="thread-timeline">
                                {getConversationThread(followUp.id).map((historyItem, index) => (
                                  <div key={historyItem.id} className="thread-exchange">
                                    <div className="thread-step-indicator">
                                      <span className="step-number">{index + 1}</span>
                                      <span className="step-line"></span>
                                    </div>
                                    <div className="thread-content">
                                      <div className="thread-question-box">
                                        <div className="thread-box-header">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                          </svg>
                                          <span>{t('qa.thread.previous_question')}</span>
                                        </div>
                                        <p>{historyItem.question || historyItem.pregunta_texto}</p>
                                      </div>
                                      <div className="thread-response-box">
                                        <div className="thread-box-header">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                          </svg>
                                          <span>{t('qa.thread.previous_response')}</span>
                                        </div>
                                        <p>{historyItem.response || historyItem.respuesta_proveedor || t('qa.thread.no_response_yet')}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="thread-current-indicator">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                                <span>{t('qa.thread.current_question')}</span>
                              </div>
                            </div>
                          )}

                          <div className="question-body">
                            <p className="question-text">{followUp.question || followUp.pregunta_texto}</p>
                          </div>
                          {(followUp.response || followUp.respuesta_proveedor) && (
                            <div className="question-response">
                              <strong>{t('qa.question.response')}</strong>
                              <p>{followUp.response || followUp.respuesta_proveedor}</p>
                            </div>
                          )}
                          <div className="question-actions">
                            {(() => {
                              const status = followUp.estado || followUp.status;
                              if (status === 'Draft' || status === 'Pending') {
                                return (
                                  <>
                                    <button onClick={(e) => handleUpdateStatus(followUp.id, 'Approved', e)} className="btn btnPrimary btn-sm">
                                      <Icons.Approve /> {t('qa.btn.approve')}
                                    </button>
                                    <button onClick={(e) => handleUpdateStatus(followUp.id, 'Discarded', e)} className="btn btnDanger btn-sm">
                                      <Icons.Discard /> {t('qa.btn.discard')}
                                    </button>
                                  </>
                                );
                              }
                              if (status === 'Approved') {
                                return (
                                  <span className="status-message">{t('qa.status.waiting')}</span>
                                );
                              }
                              if (status === 'Answered') {
                                return (
                                  <>
                                    <button onClick={(e) => handleUpdateStatus(followUp.id, 'Resolved', e)} className="btn btnSuccess btn-sm">
                                      <Icons.Approve /> {t('qa.btn.accept_response')}
                                    </button>
                                    <button onClick={(e) => handleOpenFollowUp(followUp.id, e)} className="btn btnWarning btn-sm">
                                      <Icons.Edit /> {t('qa.btn.need_more_info')}
                                    </button>
                                  </>
                                );
                              }
                              if (status === 'Resolved') {
                                return <span className="status-message resolved">{t('qa.status.resolved')}</span>;
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                ))}

                {/* Manual Question Addition */}
                <div className="add-question-area">
                  {addingToDisciplina === group.disciplina ? (
                    <div className="new-question-input card">
                      <textarea
                        placeholder={t('qa.questions.write_question')}
                        value={newQuestionTexts[group.disciplina] || ''}
                        onChange={(e) => setNewQuestionTexts(prev => ({
                          ...prev,
                          [group.disciplina]: e.target.value
                        }))}
                        className="question-edit-textarea"
                        rows={3}
                        autoFocus
                      />
                      <div className="new-question-actions">
                        <button
                          onClick={() => handleAddManualQuestion(group.disciplina)}
                          className="btn btnPrimary btn-sm"
                        >
                          <Icons.Save /> {t('qa.btn.save')}
                        </button>
                        <button
                          onClick={() => setAddingToDisciplina(null)}
                          className="btn btnSecondary btn-sm"
                        >
                          <Icons.Cancel /> {t('qa.btn.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToDisciplina(group.disciplina)}
                      className="btn btnSecondary btn-sm add-manual-btn"
                    >
                      {t('qa.questions.add_question')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>

        {/* Empty State */}
        {
          !isLoading && questions.length === 0 && (
            <div className="module-empty-state">
              <div className="module-empty-icon">
                <Icons.Paper />
              </div>
              <h3 className="module-empty-title">{t('qa.questions.no_questions')}</h3>
              <p className="module-empty-text">{t('qa.questions.no_questions_hint')}</p>
            </div>
          )
        }
      </div>

      {/* Send to Supplier Modal */}
      {showSendModal && sendResult && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content send-modal" onClick={(e) => e.stopPropagation()}>
            <div className="send-modal-header">
              <div className="send-modal-icon success">
                <Icons.Check />
              </div>
              <h2>{t('qa.modal.success_title')}</h2>
              <p>{t('qa.modal.success_subtitle')} {sendResult.provider_name}</p>
            </div>

            <div className="send-modal-body">
              <div className="send-modal-stats">
                <div className="stat-item">
                  <span className="stat-value">{sendResult.question_count}</span>
                  <span className="stat-label">{t('qa.modal.questions')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{sendResult.provider_name}</span>
                  <span className="stat-label">{t('qa.modal.provider')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {new Date(sendResult.expires_at).toLocaleDateString()}
                  </span>
                  <span className="stat-label">{t('qa.modal.expires')}</span>
                </div>
              </div>

              <div className="send-modal-link">
                <label>{t('qa.modal.link_label')}</label>
                <div className="link-input-group">
                  <input
                    type="text"
                    value={sendResult.response_link}
                    readOnly
                    className="link-input"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`copy-btn ${copiedLink ? 'copied' : ''}`}
                    title={t('qa.toast.link_copied')}
                  >
                    {copiedLink ? <Icons.Check /> : <Icons.Copy />}
                  </button>
                </div>
                <p className="link-hint">
                  {t('qa.modal.link_hint')}
                </p>
              </div>

              {sendResult.email_html && (
                <div className="send-modal-email-preview">
                  <label>{t('qa.modal.email_preview')}</label>
                  <div
                    className="email-preview-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sendResult.email_html) }}
                  />
                </div>
              )}
            </div>

            <div className="send-modal-footer">
              <button
                onClick={() => setShowSendModal(false)}
                className="btn btnPrimary"
              >
                {t('qa.modal.btn_done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Question Modal */}
      {showFollowUpModal && followUpParentId && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div className="modal-content follow-up-modal" onClick={(e) => e.stopPropagation()}>
            <div className="follow-up-modal-header">
              <h2>{t('qa.thread.follow_up')}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowFollowUpModal(false)}
              >
                <Icons.Cancel />
              </button>
            </div>

            <div className="follow-up-modal-body">
              {/* Show parent question and response */}
              {(() => {
                const parentQuestion = getParentQuestion(followUpParentId);
                if (!parentQuestion) return null;
                return (
                  <div className="parent-question-context">
                    <div className="context-section">
                      <label>{t('qa.thread.original_question')}</label>
                      <p className="context-text">{parentQuestion.question || parentQuestion.pregunta_texto}</p>
                    </div>
                    {(parentQuestion.response || parentQuestion.respuesta_proveedor) && (
                      <div className="context-section response">
                        <label>{t('qa.question.response')}</label>
                        <p className="context-text">{parentQuestion.response || parentQuestion.respuesta_proveedor}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Follow-up question textarea */}
              <div className="follow-up-input-section">
                <label>{t('qa.thread.follow_up')}</label>
                <textarea
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  placeholder={t('qa.thread.write_follow_up')}
                  rows={4}
                  className="follow-up-textarea"
                  autoFocus
                />
              </div>
            </div>

            <div className="follow-up-modal-footer">
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="btn btnSecondary"
                disabled={isCreatingFollowUp}
              >
                {t('qa.btn.cancel')}
              </button>
              <button
                onClick={handleSubmitFollowUp}
                className="btn btnPrimary"
                disabled={!followUpText.trim() || isCreatingFollowUp}
              >
                {isCreatingFollowUp ? (
                  <span className="loading-spinner-small"></span>
                ) : (
                  <>
                    <Icons.Send /> {t('qa.thread.send_follow_up')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
