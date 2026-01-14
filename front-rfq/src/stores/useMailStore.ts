import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';
import { useSessionViewStore } from './useSessionViewStore';
import type { QAQuestion } from '../types/qa.types';

// Interface for Q&A items in the mail context
export interface MailQAItem {
    id: string;
    discipline: string;
    question: string;
    importance: string;
    provider_name: string;
}

interface MailState {
    // Current Draft State
    subject: string;
    body: string;

    // Generation Status
    isGenerating: boolean;
    hasGenerated: boolean;
    error: string | null;

    // Q&A Items State
    pendingQAItems: MailQAItem[];
    selectedQAItemIds: string[];

    // Actions
    setSubject: (subject: string) => void;
    setBody: (body: string) => void;
    setHasGenerated: (value: boolean) => void;
    setError: (error: string | null) => void;
    startGeneration: () => void;
    finishGeneration: (subject: string, body: string) => void;
    failGeneration: (error: string) => void;
    reset: () => void;

    // Q&A Items Actions
    addQAItem: (item: QAQuestion) => void;
    removeQAItem: (id: string) => void;
    toggleQAItemSelection: (id: string) => void;
    selectAllQAItems: () => void;
    deselectAllQAItems: () => void;
    clearQAItems: () => void;
    getSelectedQAItems: () => MailQAItem[];

    // API Interaction (can be moved deeper if needed)
    generateDraft: (params: {
        project_name: string;
        provider_name: string;
        provider_key: string;
        tone: string;
        issues: string[];
        qa_items?: MailQAItem[];
    }) => Promise<void>;
}

export const useMailStore = create<MailState>()(
    devtools(
        subscribeWithSelector(
            persist(
                (set, get) => ({
            subject: '',
            body: '',
            isGenerating: false,
            hasGenerated: false,
            error: null,
            pendingQAItems: [],
            selectedQAItemIds: [],

            setSubject: (subject) => set({ subject }),
            setBody: (body) => set({ body }),
            setHasGenerated: (value) => set({ hasGenerated: value }),
            setError: (error) => set({ error }),

            startGeneration: () => set({
                isGenerating: true,
                error: null,
                hasGenerated: false
            }),

            finishGeneration: (subject, body) => set({
                subject,
                body,
                isGenerating: false,
                hasGenerated: true,
                error: null
            }),

            failGeneration: (error) => set({
                error,
                isGenerating: false,
                hasGenerated: false
            }),

            reset: () => set({
                subject: '',
                body: '',
                isGenerating: false,
                hasGenerated: false,
                error: null
            }),

            // Q&A Items Actions
            addQAItem: (item: QAQuestion) => {
                const mailItem: MailQAItem = {
                    id: item.id,
                    discipline: item.discipline || item.disciplina || 'General',
                    question: item.question || item.pregunta_texto || '',
                    importance: item.importance || item.importancia || 'Medium',
                    provider_name: item.provider_name || item.proveedor || ''
                };

                set(state => {
                    // Avoid duplicates
                    if (state.pendingQAItems.some(q => q.id === mailItem.id)) {
                        return state;
                    }
                    return {
                        pendingQAItems: [...state.pendingQAItems, mailItem]
                        // Items arrive unselected - user must select which to include
                    };
                });
            },

            removeQAItem: (id: string) => set(state => ({
                pendingQAItems: state.pendingQAItems.filter(item => item.id !== id),
                selectedQAItemIds: state.selectedQAItemIds.filter(itemId => itemId !== id)
            })),

            toggleQAItemSelection: (id: string) => set(state => ({
                selectedQAItemIds: state.selectedQAItemIds.includes(id)
                    ? state.selectedQAItemIds.filter(itemId => itemId !== id)
                    : [...state.selectedQAItemIds, id]
            })),

            selectAllQAItems: () => set(state => ({
                selectedQAItemIds: state.pendingQAItems.map(item => item.id)
            })),

            deselectAllQAItems: () => set({ selectedQAItemIds: [] }),

            clearQAItems: () => set({ pendingQAItems: [], selectedQAItemIds: [] }),

            getSelectedQAItems: () => {
                const state = get();
                return state.pendingQAItems.filter(item =>
                    state.selectedQAItemIds.includes(item.id)
                );
            },

            generateDraft: async (params) => {
                set({ isGenerating: true, error: null, hasGenerated: false });

                try {
                    const response = await fetch(API_CONFIG.N8N_MAIL_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(params)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    // Handle the new webhook output structure: [{ text: "```json\n{...}\n```" }]
                    let finalSubject = '';
                    let finalBody = '';
                    
                    if (Array.isArray(data) && data.length > 0 && data[0].text) {
                        // Extract JSON from the text field
                        let rawText = data[0].text;

                        // Try to find JSON object in the response (handles ```json wrapper and other formats)
                        const jsonMatch = rawText.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);

                        if (jsonMatch) {
                            try {
                                const parsedJson = JSON.parse(jsonMatch[0]);
                                finalSubject = parsedJson.subject || '';
                                finalBody = parsedJson.body || '';
                            } catch (parseError) {
                                console.warn('JSON parse failed:', parseError);
                                // Try to extract subject and body manually with regex
                                const subjectMatch = rawText.match(/"subject"\s*:\s*"([^"]+)"/);
                                const bodyMatch = rawText.match(/"body"\s*:\s*"([\s\S]*?)"\s*\}/);

                                if (subjectMatch && bodyMatch) {
                                    finalSubject = subjectMatch[1];
                                    // Unescape the body string
                                    finalBody = bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                                } else {
                                    finalSubject = 'Draft Generated';
                                    finalBody = rawText;
                                }
                            }
                        } else {
                            finalSubject = 'Draft Generated';
                            finalBody = rawText;
                        }
                    } else {
                        // Fallback for other response formats
                        const result = Array.isArray(data) ? data[0] : data;
                        finalSubject = result?.subject || result?.output?.subject || 'Draft Generated';
                        finalBody = result?.body || result?.output?.body || JSON.stringify(result, null, 2);
                    }

                    set({
                        subject: finalSubject,
                        body: finalBody,
                        isGenerating: false,
                        hasGenerated: true,
                        error: null
                    });

                    // Notificar que hay contenido nuevo en mail
                    useSessionViewStore.getState().updateContent('mail');

                } catch (error) {
                    console.error('Error generating mail:', error);
                    set({
                        error: 'Failed to generate draft. Please try again.',
                        isGenerating: false,
                        hasGenerated: false
                    });
                }
            }
        }),
        {
            name: 'mail-storage',
            partialize: (state) => ({
                subject: state.subject,
                body: state.body,
                hasGenerated: state.hasGenerated,
                pendingQAItems: state.pendingQAItems,
                selectedQAItemIds: state.selectedQAItemIds
            })
        }
            )
        ),
        { name: 'MailStore' }
    )
);
