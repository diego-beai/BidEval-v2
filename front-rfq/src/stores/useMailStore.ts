import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Interface Issue removed as it was unused

interface MailState {
    // Current Draft State
    subject: string;
    body: string;

    // Generation Status
    isGenerating: boolean;
    hasGenerated: boolean;
    error: string | null;

    // Actions
    setSubject: (subject: string) => void;
    setBody: (body: string) => void;
    setHasGenerated: (value: boolean) => void;
    setError: (error: string | null) => void;
    startGeneration: () => void;
    finishGeneration: (subject: string, body: string) => void;
    failGeneration: (error: string) => void;
    reset: () => void;

    // API Interaction (can be moved deeper if needed)
    generateDraft: (params: {
        project_name: string;
        provider_name: string;
        provider_key: string;
        tone: string;
        issues: string[];
    }) => Promise<void>;
}

export const useMailStore = create<MailState>()(
    devtools(
        (set) => ({
            subject: '',
            body: '',
            isGenerating: false,
            hasGenerated: false,
            error: null,

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

            generateDraft: async (params) => {
                set({ isGenerating: true, error: null, hasGenerated: false });

                try {
                    const response = await fetch('https://n8n.beaienergy.com/webhook-test/mail', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(params)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const text = await response.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        // Fallback if response is not valid JSON (e.g. n8n workflow finished without outputting JSON)
                        // Check if the text looks like success or failure
                        console.warn("Received non-JSON response:", text);
                        if (text && text.length > 0) {
                            // Try to treat it as raw body if it looks like a string, or simple success
                            data = { subject: 'Draft Generated (Raw)', body: text };
                        } else {
                            throw new Error("Empty response from server");
                        }
                    }

                    // Handle array response and nested output field from n8n
                    const result = Array.isArray(data) ? data[0] : data;
                    const finalSubject = result?.subject || result?.output?.subject || '';
                    const finalBody = result?.body || result?.output?.body || '';

                    set({
                        subject: finalSubject,
                        body: finalBody,
                        isGenerating: false,
                        hasGenerated: true,
                        error: null
                    });

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
        { name: 'MailStore' }
    )
);
