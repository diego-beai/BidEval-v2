export interface ESGCertification {
    id: string;
    name: string;
    category: 'environmental' | 'social' | 'governance';
    status: 'confirmed' | 'mentioned' | 'not_detected';
    confidence: number; // 0-1
}

export interface ESGCatalogEntry {
    id: string;
    name: string;
    display_name: string;
    display_name_es: string;
    category: 'environmental' | 'social' | 'governance';
}

export const ESG_CATALOG: ESGCatalogEntry[] = [
    // Environmental (5)
    { id: 'iso_14001', name: 'ISO 14001', display_name: 'ISO 14001 - Environmental Mgmt', display_name_es: 'ISO 14001 - Gestion Ambiental', category: 'environmental' },
    { id: 'iso_50001', name: 'ISO 50001', display_name: 'ISO 50001 - Energy Mgmt', display_name_es: 'ISO 50001 - Gestion Energetica', category: 'environmental' },
    { id: 'carbon_neutral', name: 'Carbon Neutral', display_name: 'Carbon Neutral Cert.', display_name_es: 'Cert. Neutralidad Carbono', category: 'environmental' },
    { id: 'sbti', name: 'SBTi', display_name: 'Science-Based Targets', display_name_es: 'Objetivos Basados en Ciencia', category: 'environmental' },
    { id: 'eu_taxonomy', name: 'EU Taxonomy', display_name: 'EU Taxonomy Alignment', display_name_es: 'Alineamiento Taxonomia UE', category: 'environmental' },
    // Social (3)
    { id: 'iso_45001', name: 'ISO 45001', display_name: 'ISO 45001 - Occupational H&S', display_name_es: 'ISO 45001 - Seguridad Laboral', category: 'social' },
    { id: 'sa_8000', name: 'SA 8000', display_name: 'SA 8000 - Social Accountability', display_name_es: 'SA 8000 - Responsabilidad Social', category: 'social' },
    { id: 'diversity_policy', name: 'D&I', display_name: 'Diversity & Inclusion Policy', display_name_es: 'Politica Diversidad e Inclusion', category: 'social' },
    // Governance (4)
    { id: 'csrd', name: 'CSRD', display_name: 'CSRD Compliance', display_name_es: 'Cumplimiento CSRD', category: 'governance' },
    { id: 'iso_37001', name: 'ISO 37001', display_name: 'ISO 37001 - Anti-bribery', display_name_es: 'ISO 37001 - Anticorrupcion', category: 'governance' },
    { id: 'esg_report', name: 'ESG Report', display_name: 'Published ESG Report', display_name_es: 'Informe ESG Publicado', category: 'governance' },
    { id: 'un_global_compact', name: 'UN GC', display_name: 'UN Global Compact', display_name_es: 'Pacto Mundial ONU', category: 'governance' },
];

export const ESG_CATEGORY_LABELS = {
    environmental: { en: 'Environmental', es: 'Medioambiental' },
    social: { en: 'Social', es: 'Social' },
    governance: { en: 'Governance', es: 'Gobernanza' },
} as const;
