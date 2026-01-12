import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';

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
                        // Extract JSON from the text field (remove ```json wrapper if present)
                        let jsonString = data[0].text;
                        
                        console.log('Raw text from webhook:', jsonString);
                        
                        // Remove all variations of json wrapper
                        jsonString = jsonString
                            .replace(/^```json\s*\n?/, '')  // Remove starting ```json
                            .replace(/```\s*$/, '')          // Remove ending ```
                            .trim();                        // Remove whitespace
                        
                        console.log('Cleaned JSON string:', jsonString);
                        
                        // Check if it looks like JSON (starts with { and ends with })
                        if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
                            try {
                                const parsedJson = JSON.parse(jsonString);
                                finalSubject = parsedJson.subject || '';
                                finalBody = parsedJson.body || '';
                                console.log('Successfully parsed - Subject:', finalSubject);
                                console.log('Successfully parsed - Body length:', finalBody.length);
                            } catch (parseError) {
                                console.warn('JSON parse failed, using raw text:', parseError);
                                finalSubject = 'Draft Generated';
                                finalBody = data[0].text;
                            }
                        } else {
                            console.warn('Text does not look like JSON, using raw text');
                            finalSubject = 'Draft Generated';
                            finalBody = data[0].text;
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
