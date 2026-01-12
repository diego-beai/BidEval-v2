import { create } from 'zustand';
// import { persist } from 'zustand/middleware';

type Language = 'es' | 'en';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

// @ts-ignore
const translations: any = {
    es: {
        // Sidebar
        'nav.home': 'Principal',
        'nav.upload': 'Subir RFQ',
        'nav.table': 'Tabla Datos',
        'nav.qa': 'Q&A Offers',
        'nav.decision': 'Scoring',
        'nav.chat': 'Chat',
        'nav.mail': 'Email AI',
        'nav.footer': 'v2.1 Beta',

        // Header
        'header.home': 'Resumen Principal',
        'header.upload': 'Gestión de RFQs y Propuestas',
        'header.table': 'Explorador de Datos',
        'header.qa': 'Q&A y Aclaraciones de Ofertas',
        'header.decision': 'Análisis de Scoring',
        'header.chat': 'Asistente IA',
        'header.mail': 'Generador de Comunicaciones',

        // Home Dashboard
        'home.hero.title': 'Bideval AI',
        'home.hero.subtitle': 'Plataforma de Evaluación de Licitaciones',
        'home.hero.desc': 'Plataforma de evaluación de licitaciones impulsada por IA. Análisis inteligente de RFQ, scoring automatizado y toma de decisiones basada en datos.',
        'home.hero.btn_new': '+ Nueva RFQ',
        'home.hero.btn_reports': 'Ver Reportes',

        'home.stats.proposals': 'Propuestas Procesadas',
        'home.stats.active': 'Proyectos Activos',
        'home.stats.efficiency': 'Eficiencia IA',
        'home.stats.trend_week': '+2 esta semana',
        'home.stats.trend_course': 'En curso',
        'home.stats.trend_high': 'Precisión alta',

        'home.chart.title': 'Estado de Cumplimiento Técnico',
        'home.chart.subtitle': 'Últimos 30 días',
        'home.chart.evaluations_by_provider': 'Evaluaciones por Proveedor',
        'home.chart.distribution': 'Distribución de estados en ofertas',

        'home.activity.title': 'Actividad Reciente',
        'home.activity.offer_received': 'Oferta Recibida',
        'home.activity.offer_desc': 'Propuesta técnica revisada automáticamente.',
        'home.activity.alert': 'Alerta de Cumplimiento',
        'home.activity.alert_desc': 'falta sección de seguridad HSE.',
        'home.activity.created': 'Nuevo RFQ Creado',
        'home.activity.created_desc': 'Proyecto Hidrógeno Verde - Fase 2',
        'home.activity.user': 'Usuario conectado',
        'home.activity.ago_2h': 'Hace 2 horas',
        'home.activity.ago_5h': 'Hace 5 horas',
        'home.activity.yesterday': 'Ayer',

        // Vendor Decision Dashboard
        'dashboard.title': 'Dashboard de Scoring de Proveedores',
        'dashboard.rfq_id': 'ID RFQ',
        'dashboard.tab.clarification': 'Aclaraciones y EyR',
        'dashboard.tab.scoring': 'Matriz de Puntuación',
        'dashboard.tab.executive': 'Resumen Ejecutivo',
        'scoring.subtitle': 'Ajusta las puntuaciones de cada proveedor',

        // Clarification View
        'clarification.filter': 'Filtrar por Proveedor',
        'clarification.table.req': 'Requisito',
        'clarification.table.resp': 'Respuesta del Proveedor',
        'clarification.table.comp': 'Cumplimiento',
        'clarification.table.actions': 'Aclaraciones y Acciones',
        'clarification.btn.send': 'Enviar Pregunta',
        'clarification.btn.approve': 'Aprobar Pregunta',
        'clarification.btn.resolve': 'Marcar Resuelto',
        'clarification.status.resolved': '✓ Resuelto',
        'clarification.export': 'Exportar Hoja EyR (.xlsx)',

        // Scoring View
        'scoring.req': 'Requisito',
        'scoring.weight': 'Peso',
        'scoring.total': 'Puntuación Ponderada',

        // Executive View
        'executive.winner': 'Ganador Recomendado',
        'executive.score': 'Puntuación',
        'executive.award': 'Adjudicar Contrato',
        'executive.radar.title': 'Comparación por Categorías',
        'executive.bar.title': 'Puntuaciones Finales Ponderadas',
        'executive.radar.subtitle': 'Comparación multidimensional por categoría',
        'executive.bar.subtitle': 'Puntuación total ponderada',

        // Upload & App
        'upload.error.file_size': 'archivo(s) demasiado grande(s). Máximo',
        'upload.confirm.delete': '¿Estás seguro de que deseas eliminar la RFQ base cargada?',
        'upload.rfq_loaded': 'RFQ Cargada',
        'upload.processed_types': 'Tipos',
        'upload.change_rfq': 'Cambiar RFQ',
        'upload.rfq_hint': 'Los requisitos de esta RFQ se usarán para comparar con las ofertas de proveedores',
        'upload.modal.replace_title': '¿Reemplazar RFQ actual?',
        'upload.modal.current': 'Ya tienes una RFQ cargada',
        'upload.modal.replace_bg': '¿Deseas reemplazarla con',
        'upload.files': 'archivos RFQ',
        'upload.btn.replace': 'Sí, reemplazar',
        'upload.btn.cancel': 'Cancelar',
        'upload.status.processing': 'Procesando RFQ... Esto puede tardar unos minutos',
        'upload.files_selected': 'archivos seleccionados',
        'upload.drop_here': 'Suelta los archivos PDF aquí...',
        'upload.drag_drop': 'Arrastra y suelta PDFs de RFQ aquí, o haz clic para seleccionar',
        'upload.view_files': 'Ver archivos',
        'upload.status.error': 'Error',
        'upload.file': 'archivo',
        'upload.btn.process': 'Procesar',
        'upload.btn.reset': 'Reiniciar',
        'upload.modal.files_title': 'Archivos RFQ Seleccionados',
        'upload.btn.close': 'Cerrar',
        'upload.btn.remove': 'Eliminar archivo',
        'upload.btn.clear_all': 'Borrar todos los archivos',
        'app.upload.tab.rfq': '1. Subir RFQ de Referencia',
        'app.upload.tab.proposals': '2. Subir Propuestas de Proveedores',
        'app.upload.supported_providers': 'Proveedores soportados: Técnicas Reunidas, IDOM, SACYR, Empresarios Agrupados, SENER, TRESCA, WORLEY',
        'common.error': 'Error',
        'upload.proposals': 'Propuestas',
        'common.reset': 'Reiniciar',
        'app.table.no_data': 'No hay datos procesados todavía. Ve a la sección de "Subir y Procesar" para comenzar.',
        'chat.placeholder': 'Escribe tu pregunta aquí...',

        // Mail Dashboard
        'mail.config': 'Configuración de Correo',
        'mail.project': 'Proyecto',
        'mail.provider': 'Proveedor Destinatario',
        'mail.provider.select': 'Seleccionar Proveedor...',
        'mail.tone': 'Tono',
        'mail.tone.formal': 'Formal',
        'mail.tone.urgent': 'Urgente',
        'mail.tone.friendly': 'Amigable',
        'mail.btn.drafting': 'Redactando...',
        'mail.btn.regenerate': 'Regenerar Borrador',
        'mail.btn.generate': 'Generar Borrador',
        'mail.empty.title': 'Listo para Redactar',
        'mail.empty.desc': 'Selecciona un proveedor para generar un borrador de correo profesional impulsado por IA.',
        'mail.preview.markdown': 'Markdown',
        'mail.preview.text': 'Texto',
        'mail.btn.discard': 'Descartar',
        'mail.btn.copy': 'Copiar al Portapapeles',
        'mail.preview.header': 'Vista Previa',
        'mail.preview.to': 'Para:',
        'mail.preview.subject': 'Asunto:',

        // Analysis Columns
        'table.col.requirement': 'Requisito',
        'table.col.phase': 'Fase',
        'table.col.evaluation': 'Evaluación',
        'table.col.description': 'Descripción del Ítem'
    },
    en: {
        // ... existing translations
        // Sidebar
        'nav.home': 'Home',
        'nav.upload': 'Upload RFQ',
        'nav.table': 'Data Table',
        'nav.qa': 'Q&A Offers',
        'nav.decision': 'Scoring',
        'nav.chat': 'Chat',
        'nav.mail': 'Mail AI',
        'nav.footer': 'v2.1 Beta',

        // Header
        'header.home': 'Main Overview',
        'header.upload': 'RFQ & Proposal Management',
        'header.table': 'Data Explorer',
        'header.qa': 'Q&A & Offer Clarifications',
        'header.decision': 'Scoring Analysis',
        'header.chat': 'AI Assistant',
        'header.mail': 'Communication Generator',

        // Home Dashboard
        'home.hero.title': 'Bideval AI',
        'home.hero.subtitle': 'Intelligent Bid Evaluation Platform',
        'home.hero.desc': 'AI-powered bid evaluation platform. Intelligent RFQ analysis, automated scoring, and data-driven decision making.',
        'home.hero.btn_new': '+ New RFQ',
        'home.hero.btn_reports': 'View Reports',

        'home.stats.proposals': 'Processed Proposals',
        'home.stats.active': 'Active Projects',
        'home.stats.efficiency': 'AI Efficiency',
        'home.stats.trend_week': '+2 this week',
        'home.stats.trend_course': 'In progress',
        'home.stats.trend_high': 'High accuracy',

        'home.chart.title': 'Technical Compliance Status',
        'home.chart.subtitle': 'Last 30 days',
        'home.chart.evaluations_by_provider': 'Evaluations by Provider',
        'home.chart.distribution': 'Distribution of status in offers',

        'home.activity.title': 'Recent Activity',
        'home.activity.offer_received': 'Offer Received',
        'home.activity.offer_desc': 'Technical proposal automatically reviewed.',
        'home.activity.alert': 'Compliance Alert',
        'home.activity.alert_desc': 'missing HSE safety section.',
        'home.activity.created': 'New RFQ Created',
        'home.activity.created_desc': 'Green Hydrogen Project - Phase 2',
        'home.activity.user': 'User connected',
        'home.activity.ago_2h': '2 hours ago',
        'home.activity.ago_5h': '5 hours ago',
        'home.activity.yesterday': 'Yesterday',

        // Vendor Decision Dashboard
        'dashboard.title': 'Vendor Scoring Dashboard',
        'dashboard.rfq_id': 'RFQ ID',
        'dashboard.tab.clarification': 'Clarification & Q&A',
        'dashboard.tab.scoring': 'Scoring Matrix',
        'dashboard.tab.executive': 'Executive Summary',
        'scoring.subtitle': 'Adjust the scores for each provider',

        // Clarification View
        'clarification.filter': 'Filter by Provider',
        'clarification.table.req': 'Requirement',
        'clarification.table.resp': 'Provider Response',
        'clarification.table.comp': 'Compliance',
        'clarification.table.actions': 'Clarification & Actions',
        'clarification.btn.send': 'Send Question',
        'clarification.btn.approve': 'Approve Question',
        'clarification.btn.resolve': 'Mark Resolved',
        'clarification.status.resolved': '✓ Resolved',
        'clarification.export': 'Export Q&A Sheet (.xlsx)',

        // Scoring View
        'scoring.req': 'Requirement',
        'scoring.weight': 'Weight',
        'scoring.total': 'Weighted Score',

        // Executive View
        'executive.winner': 'Recommended Winner',
        'executive.score': 'Score',
        'executive.award': 'Award Contract',
        'executive.radar.title': 'Category Comparison',
        'executive.bar.title': 'Final Weighted Scores',
        'executive.radar.subtitle': 'Multidimensional comparison by category',
        'executive.bar.subtitle': 'Total weighted score',

        // Upload & App
        'upload.error.file_size': 'file(s) too large. Max',
        'upload.confirm.delete': 'Are you sure you want to delete the loaded base RFQ?',
        'upload.rfq_loaded': 'RFQ Loaded',
        'upload.processed_types': 'Types',
        'upload.change_rfq': 'Change RFQ',
        'upload.rfq_hint': 'The requirements from this RFQ will be used to compare with provider proposals',
        'upload.modal.replace_title': 'Replace current RFQ?',
        'upload.modal.current': 'You already have an RFQ loaded',
        'upload.modal.replace_bg': 'Do you want to replace it with',
        'upload.files': 'RFQ files',
        'upload.btn.replace': 'Yes, replace',
        'upload.btn.cancel': 'Cancel',
        'upload.status.processing': 'Processing RFQ... This may take a few minutes',
        'upload.files_selected': 'files selected',
        'upload.drop_here': 'Drop PDF files here...',
        'upload.drag_drop': 'Drag and drop RFQ PDFs here, or click to select',
        'upload.view_files': 'View files',
        'upload.status.error': 'Error',
        'upload.file': 'file',
        'upload.btn.process': 'Process',
        'upload.btn.reset': 'Reset',
        'upload.modal.files_title': 'Selected RFQ Files',
        'upload.btn.close': 'Close',
        'upload.btn.remove': 'Remove file',
        'upload.btn.clear_all': 'Clear all files',
        'app.upload.tab.rfq': '1. Upload Reference RFQ',
        'app.upload.tab.proposals': '2. Upload Provider Proposals',
        'app.upload.supported_providers': 'Supported providers: Técnicas Reunidas, IDOM, SACYR, Empresarios Agrupados, SENER, TRESCA, WORLEY',
        'common.error': 'Error',
        'upload.proposals': 'Proposals',
        'common.reset': 'Reset',
        'app.table.no_data': 'No processed data yet. Go to "Upload & Process" section to start.',
        'chat.placeholder': 'Ask me anything...',

        // Mail Dashboard
        'mail.config': 'Mail Configuration',
        'mail.project': 'Project',
        'mail.provider': 'Recipient Provider',
        'mail.provider.select': 'Select Provider...',
        'mail.tone': 'Tone',
        'mail.tone.formal': 'Formal',
        'mail.tone.urgent': 'Urgent',
        'mail.tone.friendly': 'Friendly',
        'mail.btn.drafting': 'Drafting Email...',
        'mail.btn.regenerate': 'Regenerate Draft',
        'mail.btn.generate': 'Generate Draft',
        'mail.empty.title': 'Ready to Draft',
        'mail.empty.desc': 'Select a provider to generate a professional email draft powered by AI.',
        'mail.preview.markdown': 'Markdown',
        'mail.preview.text': 'Text',
        'mail.btn.discard': 'Discard',
        'mail.btn.copy': 'Copy to Clipboard',
        'mail.preview.header': 'Draft Preview',
        'mail.preview.to': 'To:',
        'mail.preview.subject': 'Subject:',

        // Analysis Columns
        'table.col.requirement': 'Requirement',
        'table.col.phase': 'Phase',
        'table.col.evaluation': 'Evaluation',
        'table.col.description': 'Item Description'
    }
};

// Simplified store without persistence for immediate fix
export const useLanguageStore = create<LanguageState>((set, get) => ({
    language: 'en',
    setLanguage: (lang) => set({ language: lang }),
    t: (key) => {
        const lang = get().language;
        // @ts-ignore
        const text = translations[lang][key];

        // Fallback to English if translation missing in Spanish
        if (!text && lang !== 'en') {
            // @ts-ignore
            return translations['en'][key] || key;
        }

        return text || key;
    }
}));
