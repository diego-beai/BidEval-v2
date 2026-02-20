import React from 'react';
import {
    Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';
import type { PdfTemplateConfig } from '../../../stores/usePdfTemplateStore';

/* ------------------------------------------------------------------ */
/*  Data interface                                                     */
/* ------------------------------------------------------------------ */

export interface BoardReportPdfData {
    project: {
        name: string;
        type: string;
        ref: string;
        date: string;
        currency: string;
    };
    pdfConfig: PdfTemplateConfig;
    winner: {
        name: string;
        score: number;
        margin: number;
        summary?: string;
    };
    ranking: Array<{
        position: number;
        name: string;
        score: number;
        compliance: number;
    }>;
    categories: Array<{
        name: string;
        weight: number;
        criteria: Array<{
            name: string;
            weight: number;
            providerScores: Record<string, number>;
        }>;
    }>;
    economic: Array<{
        name: string;
        price: number | null;
        discount: number;
        net: number;
        vsCheapest: string;
        tco: number | null;
        flags: string[];
    }>;
    confidence: { overall: number; level: string };
    risks: Array<{ severity: string; message: string }>;
    recommendations: string[];
    providers: Array<{
        name: string;
        rank: number;
        score: number;
        summary?: string;
        strengths: string[];
        weaknesses: string[];
    }>;
    language: 'es' | 'en';
    t: (key: string) => string;
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
};

const lighten = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.min(255, Math.round(r + (255 - r) * amount));
    const lg = Math.min(255, Math.round(g + (255 - g) * amount));
    const lb = Math.min(255, Math.round(b + (255 - b) * amount));
    return `rgb(${lr},${lg},${lb})`;
};

/* ------------------------------------------------------------------ */
/*  Styles factory (depends on primaryColor)                           */
/* ------------------------------------------------------------------ */

const createStyles = (primary: string) => {
    const light = lighten(primary, 0.92);
    const mid = lighten(primary, 0.7);

    return StyleSheet.create({
        /* Page */
        page: {
            fontFamily: 'Helvetica',
            fontSize: 9,
            color: '#1a1a2e',
            paddingTop: 70,
            paddingBottom: 50,
            paddingHorizontal: 40,
        },
        /* Header/Footer fixed */
        headerBar: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 40,
            backgroundColor: light,
            borderBottomWidth: 1,
            borderBottomColor: mid,
        },
        headerLogo: { width: 24, height: 24 },
        headerCenter: { fontSize: 8, color: '#64748b', fontFamily: 'Helvetica' },
        headerRight: { fontSize: 7, color: primary, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
        footerBar: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 32,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 40,
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
        },
        footerText: { fontSize: 7, color: '#94a3b8' },
        footerPage: { fontSize: 7, color: '#94a3b8' },

        /* Cover page */
        coverPage: {
            fontFamily: 'Helvetica',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
        },
        coverLogo: { width: 80, height: 80, marginBottom: 24 },
        coverTitle: {
            fontSize: 26,
            fontFamily: 'Helvetica-Bold',
            color: primary,
            marginBottom: 8,
            textAlign: 'center',
        },
        coverProjectName: {
            fontSize: 16,
            fontFamily: 'Helvetica-Bold',
            color: '#1a1a2e',
            marginBottom: 4,
            textAlign: 'center',
        },
        coverMeta: {
            fontSize: 10,
            color: '#64748b',
            marginBottom: 2,
            textAlign: 'center',
        },
        coverConfidential: {
            marginTop: 30,
            fontSize: 11,
            fontFamily: 'Helvetica-Bold',
            color: primary,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'center',
        },
        coverFooter: {
            marginTop: 40,
            fontSize: 8,
            color: '#94a3b8',
            textAlign: 'center',
        },
        coverLine: {
            width: 60,
            height: 3,
            backgroundColor: primary,
            marginVertical: 16,
            borderRadius: 2,
        },

        /* Sections */
        sectionTitle: {
            fontSize: 14,
            fontFamily: 'Helvetica-Bold',
            color: primary,
            marginBottom: 10,
            paddingBottom: 4,
            borderBottomWidth: 2,
            borderBottomColor: primary,
        },
        sectionSubtitle: {
            fontSize: 10,
            fontFamily: 'Helvetica-Bold',
            color: '#334155',
            marginBottom: 6,
            marginTop: 10,
        },
        paragraph: {
            fontSize: 9,
            lineHeight: 1.5,
            color: '#475569',
            marginBottom: 8,
        },

        /* Winner card */
        winnerBox: {
            backgroundColor: primary,
            borderRadius: 6,
            padding: 14,
            marginBottom: 12,
        },
        winnerName: {
            fontSize: 16,
            fontFamily: 'Helvetica-Bold',
            color: '#ffffff',
            marginBottom: 2,
        },
        winnerScore: {
            fontSize: 11,
            color: '#ffffff',
            opacity: 0.9,
        },
        winnerSummary: {
            fontSize: 9,
            color: '#ffffff',
            opacity: 0.85,
            marginTop: 6,
            lineHeight: 1.4,
        },

        /* Tables */
        table: {
            width: '100%',
            marginBottom: 12,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: light,
            borderBottomWidth: 1,
            borderBottomColor: mid,
        },
        tableRow: {
            flexDirection: 'row',
            borderBottomWidth: 0.5,
            borderBottomColor: '#e2e8f0',
            minHeight: 20,
        },
        tableRowAlt: {
            flexDirection: 'row',
            borderBottomWidth: 0.5,
            borderBottomColor: '#e2e8f0',
            backgroundColor: '#fafbfc',
            minHeight: 20,
        },
        tableCatHeaderRow: {
            flexDirection: 'row',
            backgroundColor: light,
            minHeight: 18,
            borderBottomWidth: 0.5,
            borderBottomColor: mid,
        },
        th: {
            fontSize: 7.5,
            fontFamily: 'Helvetica-Bold',
            color: '#64748b',
            paddingVertical: 5,
            paddingHorizontal: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
        },
        td: {
            fontSize: 8.5,
            paddingVertical: 4,
            paddingHorizontal: 4,
            color: '#334155',
        },
        tdBold: {
            fontSize: 8.5,
            paddingVertical: 4,
            paddingHorizontal: 4,
            color: '#334155',
            fontFamily: 'Helvetica-Bold',
        },
        tdRight: {
            fontSize: 8.5,
            paddingVertical: 4,
            paddingHorizontal: 4,
            color: '#334155',
            textAlign: 'right',
        },
        tdCenter: {
            fontSize: 8.5,
            paddingVertical: 4,
            paddingHorizontal: 4,
            color: '#334155',
            textAlign: 'center',
        },
        tdWinner: {
            fontSize: 8.5,
            paddingVertical: 4,
            paddingHorizontal: 4,
            color: primary,
            fontFamily: 'Helvetica-Bold',
            textAlign: 'center',
        },

        /* Ranking position badge */
        rankBadge: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        rankBadgeText: {
            fontSize: 8,
            color: '#ffffff',
            fontFamily: 'Helvetica-Bold',
        },

        /* Risks */
        riskItem: {
            flexDirection: 'row',
            marginBottom: 6,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 4,
            borderLeftWidth: 3,
        },
        riskHigh: { backgroundColor: '#fef2f2', borderLeftColor: '#ef4444' },
        riskMedium: { backgroundColor: '#fffbeb', borderLeftColor: '#f59e0b' },
        riskLow: { backgroundColor: '#f0f9ff', borderLeftColor: '#3b82f6' },
        riskBadge: {
            fontSize: 7,
            fontFamily: 'Helvetica-Bold',
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 3,
            marginRight: 6,
            color: '#ffffff',
        },
        riskText: { fontSize: 8.5, color: '#334155', flex: 1 },

        /* Recommendation item */
        recItem: {
            flexDirection: 'row',
            marginBottom: 4,
            paddingLeft: 8,
        },
        recBullet: {
            fontSize: 8,
            color: primary,
            marginRight: 6,
            fontFamily: 'Helvetica-Bold',
        },
        recText: { fontSize: 8.5, color: '#475569', flex: 1, lineHeight: 1.4 },

        /* Provider profile card */
        profileCard: {
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 6,
            padding: 10,
            marginBottom: 10,
        },
        profileHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
        },
        profileName: {
            fontSize: 12,
            fontFamily: 'Helvetica-Bold',
            color: '#1a1a2e',
        },
        profileRank: {
            fontSize: 8,
            color: '#ffffff',
            fontFamily: 'Helvetica-Bold',
            backgroundColor: primary,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginRight: 8,
        },
        profileScore: {
            fontSize: 10,
            color: '#64748b',
            marginLeft: 'auto',
        },
        profileSummary: {
            fontSize: 8.5,
            color: '#64748b',
            lineHeight: 1.4,
            marginBottom: 6,
            paddingLeft: 8,
            borderLeftWidth: 2,
            borderLeftColor: primary,
        },
        profileListTitle: {
            fontSize: 8,
            fontFamily: 'Helvetica-Bold',
            marginBottom: 3,
            marginTop: 4,
        },
        profileListItem: {
            fontSize: 8,
            color: '#475569',
            marginBottom: 2,
            paddingLeft: 10,
            lineHeight: 1.4,
        },

        /* Confidence */
        confidenceRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
        },
        confidenceLabel: {
            fontSize: 9,
            color: '#475569',
            width: 140,
        },
        confidenceBar: {
            flex: 1,
            height: 8,
            backgroundColor: '#f1f5f9',
            borderRadius: 4,
            overflow: 'hidden',
        },
        confidenceFill: {
            height: 8,
            borderRadius: 4,
        },
        confidenceValue: {
            fontSize: 8,
            fontFamily: 'Helvetica-Bold',
            color: '#334155',
            width: 40,
            textAlign: 'right',
        },

        /* Overall row */
        overallRow: {
            flexDirection: 'row',
            backgroundColor: primary,
            minHeight: 24,
            borderRadius: 4,
            marginTop: 2,
        },
        overallTd: {
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: '#ffffff',
            paddingVertical: 5,
            paddingHorizontal: 4,
            textAlign: 'center',
        },

        /* Weight badge */
        weightBadge: {
            fontSize: 7,
            color: '#ffffff',
            backgroundColor: primary,
            borderRadius: 8,
            paddingHorizontal: 4,
            paddingVertical: 1,
            textAlign: 'center',
        },
    });
};

/* ------------------------------------------------------------------ */
/*  Column width configs                                               */
/* ------------------------------------------------------------------ */

const RANK_COL = { pos: '8%', name: '40%', score: '26%', compliance: '26%' };
const ECON_COL = { name: '20%', price: '14%', disc: '10%', net: '14%', vs: '14%', tco: '14%', flags: '14%' };

/* ------------------------------------------------------------------ */
/*  Cover Page                                                         */
/* ------------------------------------------------------------------ */

const CoverPage: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => (
    <Page size="A4" style={s.coverPage}>
        {data.pdfConfig.logoDataUrl ? (
            <Image src={data.pdfConfig.logoDataUrl} style={s.coverLogo} />
        ) : null}
        <Text style={s.coverTitle}>
            {data.t('board.report_title')}
        </Text>
        <View style={s.coverLine} />
        <Text style={s.coverProjectName}>{data.project.name}</Text>
        {data.project.type ? (
            <Text style={s.coverMeta}>{data.project.type}</Text>
        ) : null}
        {data.project.ref ? (
            <Text style={s.coverMeta}>{data.project.ref}</Text>
        ) : null}
        <Text style={s.coverMeta}>{data.project.date}</Text>
        <Text style={s.coverConfidential}>
            {data.language === 'es' ? 'CONFIDENCIAL' : 'CONFIDENTIAL'}
        </Text>
        <Text style={s.coverFooter}>
            {data.language === 'es' ? 'Generado por BidEval v2' : 'Generated by BidEval v2'}
        </Text>
    </Page>
);

/* ------------------------------------------------------------------ */
/*  Page wrapper with header/footer                                    */
/* ------------------------------------------------------------------ */

const ReportPage: React.FC<{
    data: BoardReportPdfData;
    s: ReturnType<typeof createStyles>;
    children: React.ReactNode;
}> = ({ data, s, children }) => (
    <Page size="A4" style={s.page} wrap>
        {/* Fixed header */}
        <View style={s.headerBar} fixed>
            {data.pdfConfig.logoDataUrl ? (
                <Image src={data.pdfConfig.logoDataUrl} style={s.headerLogo} />
            ) : (
                <Text style={s.headerCenter}>BidEval</Text>
            )}
            <Text style={s.headerCenter}>{data.project.name}</Text>
            <Text style={s.headerRight}>
                {data.language === 'es' ? 'CONFIDENCIAL' : 'CONFIDENTIAL'}
            </Text>
        </View>

        {children}

        {/* Fixed footer */}
        <View style={s.footerBar} fixed>
            <Text style={s.footerText}>
                {data.pdfConfig.footerText || 'BidEval v2'}
            </Text>
            {data.pdfConfig.showPageNumbers && (
                <Text style={s.footerPage} render={({ pageNumber, totalPages }) =>
                    `${data.language === 'es' ? 'Pagina' : 'Page'} ${pageNumber} / ${totalPages}`
                } />
            )}
        </View>
    </Page>
);

/* ------------------------------------------------------------------ */
/*  Section: Executive Summary                                         */
/* ------------------------------------------------------------------ */

const ExecutiveSummary: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => {
    const confidenceColor = data.confidence.overall >= 75 ? '#10b981'
        : data.confidence.overall >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <View>
            <Text style={s.sectionTitle}>
                {data.language === 'es' ? '1. Resumen Ejecutivo' : '1. Executive Summary'}
            </Text>

            {/* Winner box */}
            <View style={s.winnerBox}>
                <Text style={s.winnerName}>{data.winner.name}</Text>
                <Text style={s.winnerScore}>
                    {data.winner.score.toFixed(2)} / 10
                    {data.winner.margin > 0 ? `  (+${data.winner.margin.toFixed(2)} pts)` : ''}
                </Text>
                {data.winner.summary ? (
                    <Text style={s.winnerSummary}>{data.winner.summary}</Text>
                ) : null}
            </View>

            {/* Confidence */}
            <View style={s.confidenceRow}>
                <Text style={s.confidenceLabel}>
                    {data.t('board.section_confidence')}:
                </Text>
                <View style={s.confidenceBar}>
                    <View style={[s.confidenceFill, {
                        width: `${Math.min(100, data.confidence.overall)}%`,
                        backgroundColor: confidenceColor,
                    }]} />
                </View>
                <Text style={s.confidenceValue}>{data.confidence.overall.toFixed(0)}%</Text>
            </View>
        </View>
    );
};

/* ------------------------------------------------------------------ */
/*  Section: Ranking                                                   */
/* ------------------------------------------------------------------ */

const RankingSection: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => (
    <View wrap={false}>
        <Text style={s.sectionTitle}>
            {data.language === 'es' ? '2. Ranking General' : '2. Overall Ranking'}
        </Text>
        <View style={s.table}>
            <View style={s.tableHeader}>
                <Text style={[s.th, { width: RANK_COL.pos, textAlign: 'center' }]}>#</Text>
                <Text style={[s.th, { width: RANK_COL.name }]}>{data.t('board.econ_provider')}</Text>
                <Text style={[s.th, { width: RANK_COL.score, textAlign: 'center' }]}>Score</Text>
                <Text style={[s.th, { width: RANK_COL.compliance, textAlign: 'center' }]}>
                    {data.language === 'es' ? 'Cumplimiento' : 'Compliance'}
                </Text>
            </View>
            {data.ranking.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tdCenter, { width: RANK_COL.pos }]}>{r.position}</Text>
                    <Text style={[i === 0 ? s.tdBold : s.td, { width: RANK_COL.name }]}>{r.name}</Text>
                    <Text style={[i === 0 ? s.tdWinner : s.tdCenter, { width: RANK_COL.score }]}>
                        {r.score.toFixed(2)}
                    </Text>
                    <Text style={[s.tdCenter, { width: RANK_COL.compliance }]}>
                        {r.compliance.toFixed(1)}%
                    </Text>
                </View>
            ))}
        </View>
    </View>
);

/* ------------------------------------------------------------------ */
/*  Section: Category Breakdown                                        */
/* ------------------------------------------------------------------ */

const CategorySection: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => {
    if (!data.categories.length) return null;

    const providerNames = data.ranking.map(r => r.name);
    const nameColWidth = 24;
    const weightColWidth = 8;
    const provColWidth = providerNames.length > 0
        ? (100 - nameColWidth - weightColWidth) / providerNames.length
        : 20;

    return (
        <View>
            <Text style={s.sectionTitle}>
                {data.language === 'es' ? '3. Desglose por Categorias' : '3. Category Breakdown'}
            </Text>
            <View style={s.table}>
                {/* Header */}
                <View style={s.tableHeader}>
                    <Text style={[s.th, { width: `${nameColWidth}%` }]}>{data.t('board.col_category')}</Text>
                    <Text style={[s.th, { width: `${weightColWidth}%`, textAlign: 'center' }]}>{data.t('board.col_weight')}</Text>
                    {providerNames.map((name, i) => (
                        <Text key={i} style={[s.th, { width: `${provColWidth}%`, textAlign: 'center' }]}>
                            {name.length > 14 ? name.slice(0, 13) + '..' : name}
                        </Text>
                    ))}
                </View>

                {data.categories.map((cat, ci) => {
                    // Find best provider score for each criterion
                    return (
                        <React.Fragment key={ci}>
                            {/* Category header */}
                            <View style={s.tableCatHeaderRow}>
                                <Text style={[s.tdBold, { width: '100%', fontSize: 8 }]}>
                                    {cat.name} ({cat.weight}%)
                                </Text>
                            </View>

                            {/* Criteria rows */}
                            {cat.criteria.map((crit, cri) => {
                                const scores = providerNames.map(n => crit.providerScores[n] ?? 0);
                                const best = Math.max(...scores);
                                return (
                                    <View key={cri} style={cri % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                                        <Text style={[s.td, { width: `${nameColWidth}%`, paddingLeft: 12, fontSize: 8 }]}>
                                            {crit.name}
                                        </Text>
                                        <Text style={[s.tdCenter, { width: `${weightColWidth}%` }]}>
                                            <Text style={s.weightBadge}>{crit.weight}%</Text>
                                        </Text>
                                        {providerNames.map((name, pi) => {
                                            const score = crit.providerScores[name] ?? 0;
                                            const isBest = score === best && best > 0;
                                            return (
                                                <Text
                                                    key={pi}
                                                    style={[
                                                        isBest ? s.tdWinner : s.tdCenter,
                                                        { width: `${provColWidth}%` },
                                                    ]}
                                                >
                                                    {score > 0 ? score.toFixed(2) : '-'}
                                                </Text>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
};

/* ------------------------------------------------------------------ */
/*  Section: Economic Comparison                                       */
/* ------------------------------------------------------------------ */

const EconomicSection: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => {
    if (!data.economic.length) return null;

    return (
        <View>
            <Text style={s.sectionTitle}>
                {data.language === 'es' ? '4. Comparativa Economica' : '4. Economic Comparison'}
            </Text>
            <View style={s.table}>
                <View style={s.tableHeader}>
                    <Text style={[s.th, { width: ECON_COL.name }]}>{data.t('board.econ_provider')}</Text>
                    <Text style={[s.th, { width: ECON_COL.price, textAlign: 'right' }]}>{data.t('board.econ_price')}</Text>
                    <Text style={[s.th, { width: ECON_COL.disc, textAlign: 'center' }]}>{data.t('board.econ_discount')}</Text>
                    <Text style={[s.th, { width: ECON_COL.net, textAlign: 'right' }]}>{data.t('board.econ_net')}</Text>
                    <Text style={[s.th, { width: ECON_COL.vs, textAlign: 'right' }]}>{data.t('board.econ_vs_cheapest')}</Text>
                    <Text style={[s.th, { width: ECON_COL.tco, textAlign: 'right' }]}>TCO</Text>
                    <Text style={[s.th, { width: ECON_COL.flags, textAlign: 'center' }]}>{data.t('board.econ_flags')}</Text>
                </View>
                {data.economic.map((e, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <Text style={[i === 0 ? s.tdBold : s.td, { width: ECON_COL.name }]}>{e.name}</Text>
                        <Text style={[s.tdRight, { width: ECON_COL.price }]}>
                            {e.price != null ? formatCurrency(e.price, data.project.currency, data.language) : '-'}
                        </Text>
                        <Text style={[s.tdCenter, { width: ECON_COL.disc }]}>
                            {e.discount > 0 ? `${e.discount.toFixed(1)}%` : '-'}
                        </Text>
                        <Text style={[s.tdRight, { width: ECON_COL.net }]}>
                            {formatCurrency(e.net, data.project.currency, data.language)}
                        </Text>
                        <Text style={[s.tdRight, { width: ECON_COL.vs }]}>{e.vsCheapest}</Text>
                        <Text style={[s.tdRight, { width: ECON_COL.tco }]}>
                            {e.tco != null ? formatCurrency(e.tco, data.project.currency, data.language) : '-'}
                        </Text>
                        <Text style={[s.tdCenter, { width: ECON_COL.flags }]}>
                            {e.flags.length > 0 ? `⚠ ${e.flags.length}` : '-'}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

/* ------------------------------------------------------------------ */
/*  Section: Risks & Recommendations                                   */
/* ------------------------------------------------------------------ */

const RiskSection: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => (
    <View>
        <Text style={s.sectionTitle}>
            {data.language === 'es' ? '5. Riesgos y Recomendaciones' : '5. Risks & Recommendations'}
        </Text>

        {data.risks.length > 0 ? (
            data.risks.map((r, i) => {
                const severityStyle = r.severity === 'high' ? s.riskHigh
                    : r.severity === 'medium' ? s.riskMedium : s.riskLow;
                const badgeColor = r.severity === 'high' ? '#ef4444'
                    : r.severity === 'medium' ? '#f59e0b' : '#3b82f6';
                const badgeLabel = r.severity === 'high' ? data.t('board.severity_high')
                    : r.severity === 'medium' ? data.t('board.severity_medium')
                    : data.t('board.severity_low');
                return (
                    <View key={i} style={[s.riskItem, severityStyle]} wrap={false}>
                        <Text style={[s.riskBadge, { backgroundColor: badgeColor }]}>{badgeLabel}</Text>
                        <Text style={s.riskText}>{r.message}</Text>
                    </View>
                );
            })
        ) : (
            <Text style={s.paragraph}>{data.t('board.no_risks')}</Text>
        )}

        {data.recommendations.length > 0 && (
            <View style={{ marginTop: 10 }}>
                <Text style={s.sectionSubtitle}>{data.t('board.ai_recommendations')}</Text>
                {data.recommendations.map((rec, i) => (
                    <View key={i} style={s.recItem} wrap={false}>
                        <Text style={s.recBullet}>•</Text>
                        <Text style={s.recText}>{rec}</Text>
                    </View>
                ))}
            </View>
        )}
    </View>
);

/* ------------------------------------------------------------------ */
/*  Section: Provider Profiles                                         */
/* ------------------------------------------------------------------ */

const ProfilesSection: React.FC<{ data: BoardReportPdfData; s: ReturnType<typeof createStyles> }> = ({ data, s }) => (
    <View>
        <Text style={s.sectionTitle}>
            {data.language === 'es' ? '6. Perfiles de Proveedores' : '6. Provider Profiles'}
        </Text>

        {data.providers.map((p, i) => (
            <View key={i} style={s.profileCard} wrap={false}>
                <View style={s.profileHeader}>
                    <Text style={s.profileRank}>#{p.rank}</Text>
                    <Text style={s.profileName}>{p.name}</Text>
                    <Text style={s.profileScore}>{p.score.toFixed(2)} / 10</Text>
                </View>

                {p.summary ? (
                    <Text style={s.profileSummary}>{p.summary}</Text>
                ) : null}

                {p.strengths.length > 0 && (
                    <View>
                        <Text style={[s.profileListTitle, { color: '#10b981' }]}>
                            {data.t('board.strengths')}
                        </Text>
                        {p.strengths.map((str, si) => (
                            <Text key={si} style={s.profileListItem}>• {str}</Text>
                        ))}
                    </View>
                )}

                {p.weaknesses.length > 0 && (
                    <View>
                        <Text style={[s.profileListTitle, { color: '#ef4444' }]}>
                            {data.t('board.weaknesses')}
                        </Text>
                        {p.weaknesses.map((w, wi) => (
                            <Text key={wi} style={s.profileListItem}>• {w}</Text>
                        ))}
                    </View>
                )}
            </View>
        ))}
    </View>
);

/* ------------------------------------------------------------------ */
/*  Currency formatter                                                 */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number, currency: string, lang: 'es' | 'en'): string {
    try {
        return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
            style: 'currency',
            currency: currency || 'EUR',
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return value.toLocaleString();
    }
}

/* ------------------------------------------------------------------ */
/*  Main Document                                                      */
/* ------------------------------------------------------------------ */

const BoardReportDocument: React.FC<{ data: BoardReportPdfData }> = ({ data }) => {
    const s = createStyles(data.pdfConfig.primaryColor || '#0a2540');

    return (
        <Document
            title={`${data.project.name} - ${data.t('board.report_title')}`}
            author={data.pdfConfig.companyName || 'BidEval v2'}
            subject={data.t('board.report_title')}
        >
            {/* Cover Page */}
            <CoverPage data={data} s={s} />

            {/* Content Pages */}
            <ReportPage data={data} s={s}>
                <ExecutiveSummary data={data} s={s} />
                <RankingSection data={data} s={s} />
                <CategorySection data={data} s={s} />
                <EconomicSection data={data} s={s} />
                <RiskSection data={data} s={s} />
                <ProfilesSection data={data} s={s} />

                {/* Disclaimer footer */}
                <View style={{ marginTop: 20, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 7, color: '#94a3b8', lineHeight: 1.4, textAlign: 'center' }}>
                        {data.t('board.footer_disclaimer')}
                    </Text>
                </View>
            </ReportPage>
        </Document>
    );
};

/* ------------------------------------------------------------------ */
/*  Public download function                                           */
/* ------------------------------------------------------------------ */

export async function downloadBoardReportPdf(data: BoardReportPdfData): Promise<void> {
    const blob = await pdf(<BoardReportDocument data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = data.project.name.replace(/\s+/g, '-');
    link.download = `${safeName}-board-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
