export type ComplianceStatus = 'Full' | 'Partial' | 'Not Found' | 'Ambiguous';

export interface DashboardRequirement {
    id: string;
    text: string;
    weight: number;
    category: string;
}

export interface ProviderResponse {
    req_id: string;
    match_text: string;
    status: ComplianceStatus;
    auto_score: number;
    generated_question?: string;
    user_score?: number; // Manual override
    question_status?: 'pending' | 'approved' | 'resolved';
}

export interface DashboardProvider {
    id: string;
    name: string;
    providerKey: string;
    responses: ProviderResponse[];
}

export interface DashboardData {
    rfq_id: string;
    requirements: DashboardRequirement[];
    providers: DashboardProvider[];
}
