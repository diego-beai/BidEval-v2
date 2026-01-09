import { create } from 'zustand';
import { DashboardData, DashboardProvider, DashboardRequirement } from '../types/dashboard';
import { Provider } from '../types/provider.types';

interface DashboardState {
    data: DashboardData | null;
    isLoading: boolean;
    activeProviderId: string | null; // For Clarification View

    // Actions
    loadDashboardData: () => Promise<void>;
    updateScore: (providerId: string, reqId: string, score: number) => void;
    updateQuestionStatus: (providerId: string, reqId: string, status: 'approved' | 'resolved') => void;
    setActiveProvider: (id: string) => void;
}

// Mock Data Generator
const generateMockData = (): DashboardData => {
    const requirements: DashboardRequirement[] = [
        // TECHNICAL (40%)
        { id: 'r1', text: 'System Efficiency (BOP)', weight: 0.15, category: 'TECHNICAL' },
        { id: 'r2', text: 'Degradation & Lifetime', weight: 0.10, category: 'TECHNICAL' },
        { id: 'r3', text: 'Operational Flexibility', weight: 0.10, category: 'TECHNICAL' },
        { id: 'r4', text: 'Purity & Pressure', weight: 0.05, category: 'TECHNICAL' },
        // ECONOMIC (30%)
        { id: 'r5', text: 'Total CAPEX', weight: 0.15, category: 'ECONOMIC' },
        { id: 'r6', text: 'Guaranteed OPEX', weight: 0.10, category: 'ECONOMIC' },
        { id: 'r7', text: 'Warranties & Penalties', weight: 0.05, category: 'ECONOMIC' },
        // EXECUTION (20%)
        { id: 'r8', text: 'Delivery Lead Time', weight: 0.10, category: 'EXECUTION' },
        { id: 'r9', text: 'Track Record', weight: 0.05, category: 'EXECUTION' },
        { id: 'r10', text: 'Provider Strength', weight: 0.05, category: 'EXECUTION' },
        // HSE/ESG (10%)
        { id: 'r11', text: 'Safety & ATEX', weight: 0.05, category: 'HSE/ESG' },
        { id: 'r12', text: 'Sustainability', weight: 0.05, category: 'HSE/ESG' },
    ];

    const providers: DashboardProvider[] = [
        {
            id: 'p1',
            name: 'TR',
            providerKey: Provider.TR,
            responses: [
                { req_id: 'r1', match_text: '52 kWh/kg H2 including auxiliaries', status: 'Partial', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r2', match_text: '60,000 hrs guaranteed, 1.5% annual degradation', status: 'Partial', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r3', match_text: 'Turndown 20%, ramp 10%/min', status: 'Partial', auto_score: 6, generated_question: 'Can turndown be improved to 15%?', question_status: 'pending' },
                { req_id: 'r4', match_text: '99.999% purity, 30 bar without compressor', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€3.2M total CAPEX installed', status: 'Partial', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€85k/year preventive maintenance', status: 'Partial', auto_score: 6, generated_question: 'Does this include critical spare parts?', question_status: 'pending' },
                { req_id: 'r7', match_text: '5 years base warranty, no penalties', status: 'Partial', auto_score: 6, generated_question: 'What coverage in case of failure?', question_status: 'pending' },
                { req_id: 'r8', match_text: '42 weeks from contract signature', status: 'Partial', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r9', match_text: '15 PEM plants >5MW operational', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r10', match_text: 'Solid company, service network in Spain', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX Zone 2, IECEx certified', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 15 tCO2/unit', status: 'Partial', auto_score: 7, question_status: 'resolved' },
            ]
        },
        {
            id: 'p2',
            name: 'IDOM',
            providerKey: Provider.IDOM,
            responses: [
                { req_id: 'r1', match_text: '48 kWh/kg H2 with advanced optimization', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r2', match_text: '80,000 hrs guaranteed, 1.0% annual degradation', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r3', match_text: 'Turndown 10%, ramp 15%/min', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.9999% purity, 35 bar direct', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€2.8M competitive CAPEX', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€70k/year with spare parts included', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r7', match_text: '7 years extended warranty + penalties', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r8', match_text: '36 weeks express delivery', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r9', match_text: '22 PEM plants installed globally', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r10', match_text: 'Leading company, international presence', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX full compliance, ISO 45001', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 8 tCO2/unit, 85% recyclable', status: 'Full', auto_score: 10, question_status: 'resolved' },
            ]
        },
        {
            id: 'p3',
            name: 'SACYR',
            providerKey: Provider.SACYR,
            responses: [
                { req_id: 'r1', match_text: '58 kWh/kg H2 estimated', status: 'Partial', auto_score: 5, generated_question: 'Can you guarantee this value?', question_status: 'pending' },
                { req_id: 'r2', match_text: '50,000 hrs estimated, 2% degradation', status: 'Partial', auto_score: 5, generated_question: 'Is there warranty for these figures?', question_status: 'pending' },
                { req_id: 'r3', match_text: 'Turndown 30%, ramp 5%/min', status: 'Partial', auto_score: 4, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.99% purity, 25 bar', status: 'Partial', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€3.5M initial CAPEX', status: 'Partial', auto_score: 6, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€95k/year maintenance', status: 'Partial', auto_score: 5, generated_question: 'What does maintenance include?', question_status: 'pending' },
                { req_id: 'r7', match_text: '3 years basic warranty', status: 'Partial', auto_score: 5, generated_question: 'Can warranty be extended?', question_status: 'pending' },
                { req_id: 'r8', match_text: '52 weeks lead time', status: 'Partial', auto_score: 5, question_status: 'resolved' },
                { req_id: 'r9', match_text: '5 alkaline plants installed', status: 'Partial', auto_score: 4, generated_question: 'PEM experience?', question_status: 'pending' },
                { req_id: 'r10', match_text: 'National company, limited network', status: 'Partial', auto_score: 6, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'Basic ATEX certification', status: 'Partial', auto_score: 6, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 20 tCO2/unit', status: 'Partial', auto_score: 5, question_status: 'resolved' },
            ]
        },
        {
            id: 'p4',
            name: 'EA',
            providerKey: Provider.EA,
            responses: [
                { req_id: 'r1', match_text: '46 kWh/kg H2 best in class', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r2', match_text: '90,000 hrs guaranteed, 0.8% annual degradation', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r3', match_text: 'Turndown 5%, ramp 20%/min', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.9999% purity, 40 bar direct', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€2.6M optimized CAPEX', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€65k/year all-inclusive', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r7', match_text: '10 years warranty + availability penalties', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r8', match_text: '32 weeks fast-track', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r9', match_text: '28 PEM plants >10MW operational', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r10', match_text: 'Industry leader, 24/7 support', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX + SIL2, ISO 45001 certified', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 6 tCO2/unit, 90% recyclable', status: 'Full', auto_score: 10, question_status: 'resolved' },
            ]
        },
        {
            id: 'p5',
            name: 'SENER',
            providerKey: Provider.SENER,
            responses: [
                { req_id: 'r1', match_text: '50 kWh/kg H2 proven efficiency', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r2', match_text: '70,000 hrs guaranteed, 1.2% degradation', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r3', match_text: 'Turndown 15%, ramp 12%/min', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.999% purity, 32 bar', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€3.0M competitive CAPEX', status: 'Partial', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€78k/year scheduled maintenance', status: 'Full', auto_score: 7, question_status: 'resolved' },
                { req_id: 'r7', match_text: '6 years warranty + basic coverage', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r8', match_text: '38 weeks standard delivery', status: 'Full', auto_score: 8, question_status: 'resolved' },
                { req_id: 'r9', match_text: '18 PEM plants installed in Europe', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r10', match_text: 'Solid company, extensive service network', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX Zone 1&2, full certification', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 12 tCO2/unit, 75% recyclable', status: 'Full', auto_score: 8, question_status: 'resolved' },
            ]
        },
        {
            id: 'p6',
            name: 'TRESCA',
            providerKey: Provider.TRESCA,
            responses: [
                { req_id: 'r1', match_text: '62 kWh/kg H2 per simulations', status: 'Partial', auto_score: 4, generated_question: 'Data validated in actual plant?', question_status: 'pending' },
                { req_id: 'r2', match_text: '45,000 hrs estimated, 2.5% degradation', status: 'Partial', auto_score: 4, generated_question: 'Is there warranty?', question_status: 'pending' },
                { req_id: 'r3', match_text: 'Turndown 40%, ramp 3%/min', status: 'Partial', auto_score: 3, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.9% purity, 20 bar', status: 'Partial', auto_score: 6, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€3.8M proposed CAPEX', status: 'Partial', auto_score: 5, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€110k/year estimated', status: 'Partial', auto_score: 4, generated_question: 'What does contract cover?', question_status: 'pending' },
                { req_id: 'r7', match_text: '2 years standard warranty', status: 'Partial', auto_score: 4, generated_question: 'Extension options?', question_status: 'pending' },
                { req_id: 'r8', match_text: '60 weeks manufacturing', status: 'Partial', auto_score: 4, question_status: 'resolved' },
                { req_id: 'r9', match_text: '2 small alkaline plants', status: 'Partial', auto_score: 3, generated_question: 'PEM references?', question_status: 'pending' },
                { req_id: 'r10', match_text: 'Small company, local support', status: 'Partial', auto_score: 5, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX certification in progress', status: 'Partial', auto_score: 5, generated_question: 'When will it be certified?', question_status: 'pending' },
                { req_id: 'r12', match_text: 'Carbon footprint 25 tCO2/unit', status: 'Partial', auto_score: 4, question_status: 'resolved' },
            ]
        },
        {
            id: 'p7',
            name: 'WORLEY',
            providerKey: Provider.WORLEY,
            responses: [
                { req_id: 'r1', match_text: '47 kWh/kg H2 advanced technology', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r2', match_text: '85,000 hrs guaranteed, 0.9% annual degradation', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r3', match_text: 'Turndown 8%, ramp 18%/min', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r4', match_text: '99.99999% purity, 38 bar direct', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r5', match_text: '€2.7M all-inclusive CAPEX', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r6', match_text: '€68k/year full-service', status: 'Full', auto_score: 9, question_status: 'resolved' },
                { req_id: 'r7', match_text: '8 years extended warranty + SLA penalties', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r8', match_text: '34 weeks guaranteed delivery', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r9', match_text: '32 PEM plants >15MW worldwide', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r10', match_text: 'Global leader, worldwide support network', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r11', match_text: 'ATEX + SIL3, all HSE certifications', status: 'Full', auto_score: 10, question_status: 'resolved' },
                { req_id: 'r12', match_text: 'Carbon footprint 7 tCO2/unit, 88% recyclable', status: 'Full', auto_score: 10, question_status: 'resolved' },
            ]
        }
    ];

    return {
        rfq_id: 'Hydrogen Production Plant – La Zaida, Spain',
        requirements,
        providers
    };
};

export const useDashboardStore = create<DashboardState>((set) => ({
    data: null,
    isLoading: false,
    activeProviderId: null,

    loadDashboardData: async () => {
        const mockData = generateMockData();
        set({
            data: mockData,
            isLoading: false,
            activeProviderId: mockData.providers[0].id
        });
    },

    updateScore: (providerId, reqId, score) => {
        set((state) => {
            if (!state.data) return state;

            const newProviders = state.data.providers.map(p => {
                if (p.id !== providerId) return p;
                return {
                    ...p,
                    responses: p.responses.map(r => {
                        if (r.req_id !== reqId) return r;
                        return { ...r, user_score: score };
                    })
                };
            });

            return {
                data: {
                    ...state.data,
                    providers: newProviders
                }
            };
        });
    },

    updateQuestionStatus: (providerId, reqId, status) => {
        set((state) => {
            if (!state.data) return state;

            const newProviders = state.data.providers.map(p => {
                if (p.id !== providerId) return p;
                return {
                    ...p,
                    responses: p.responses.map(r => {
                        if (r.req_id !== reqId) return r;
                        return { ...r, question_status: status };
                    })
                };
            });

            return {
                data: {
                    ...state.data,
                    providers: newProviders
                }
            };
        });
    },

    setActiveProvider: (id) => set({ activeProviderId: id }),
}));
