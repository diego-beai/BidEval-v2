#!/usr/bin/env python3
"""
Generador de PDFs ficticios para demo BidEval v2.
Proyecto: Ingenieria y Construccion de Planta de Procesamiento de Gas Natural - Fase FEED
"""

import os
import sys
import subprocess

try:
    from fpdf import FPDF
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2"])
    from fpdf import FPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SUPPLIERS = {
    "Supplier_01": {
        "nombre": "TechnoEngineering Solutions S.L.",
        "cif": "B-12345678",
        "perfil": "Lider tecnologico con amplia experiencia en proyectos FEED de oil&gas",
        "sede": "Madrid",
        "empleados": 850,
        "experiencia_anos": 25,
        "fortaleza": "Excelencia tecnica, equipo senior altamente cualificado",
        "debilidad": "Precio medio-alto",
        "capex": {"ingenieria": 3_200_000, "procura": 4_100_000, "construccion": 5_800_000, "commissioning": 1_400_000},
        "opex": {"personal": 620_000, "mantenimiento": 280_000, "consumibles": 95_000, "seguros": 145_000},
        "cert": ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018", "ASME U-Stamp", "API Q1"],
        "compliance_level": "alto",
    },
    "Supplier_02": {
        "nombre": "Iberia Industrial Projects S.A.",
        "cif": "A-87654321",
        "perfil": "Empresa equilibrada con presencia nacional e internacional",
        "sede": "Barcelona",
        "empleados": 620,
        "experiencia_anos": 18,
        "fortaleza": "Relacion calidad-precio, flexibilidad",
        "debilidad": "Menor experiencia internacional",
        "capex": {"ingenieria": 2_800_000, "procura": 3_750_000, "construccion": 5_200_000, "commissioning": 1_250_000},
        "opex": {"personal": 540_000, "mantenimiento": 260_000, "consumibles": 88_000, "seguros": 130_000},
        "cert": ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018", "ASME U-Stamp"],
        "compliance_level": "medio-alto",
    },
    "Supplier_03": {
        "nombre": "Global Process Engineering Ltd",
        "cif": "N-11223344",
        "perfil": "Firma internacional con oficina en Espana, enfoque en costes competitivos",
        "sede": "Bilbao (oficina Espana)",
        "empleados": 1200,
        "experiencia_anos": 15,
        "fortaleza": "Precio muy competitivo, gran capacidad de recursos",
        "debilidad": "Compliance y HSE por debajo de la media del sector",
        "capex": {"ingenieria": 2_400_000, "procura": 3_300_000, "construccion": 4_600_000, "commissioning": 1_050_000},
        "opex": {"personal": 480_000, "mantenimiento": 220_000, "consumibles": 75_000, "seguros": 110_000},
        "cert": ["ISO 9001:2015", "ISO 14001:2015"],
        "compliance_level": "bajo",
    },
    "Supplier_04": {
        "nombre": "MediterraneanEPC Group S.L.",
        "cif": "B-99887766",
        "perfil": "Referente en HSE y sostenibilidad, proyectos premium",
        "sede": "Valencia",
        "empleados": 480,
        "experiencia_anos": 22,
        "fortaleza": "Compliance excelente, innovacion en sostenibilidad",
        "debilidad": "Precio mas elevado del mercado",
        "capex": {"ingenieria": 3_500_000, "procura": 4_400_000, "construccion": 6_200_000, "commissioning": 1_600_000},
        "opex": {"personal": 680_000, "mantenimiento": 310_000, "consumibles": 105_000, "seguros": 160_000},
        "cert": ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018", "ASME U-Stamp", "API Q1", "ISO 50001:2018", "OHSAS 18001"],
        "compliance_level": "excelente",
    },
}

PROJECT_NAME = "Proyecto de Ingenieria y Construccion de Planta de Procesamiento de Gas Natural - Fase FEED"
PROJECT_REF = "RFP-2025-FEED-GNL-001"
CLIENT_NAME = "Energias del Levante S.A."


# ─── PDF base class ───────────────────────────────────────────────────────────

class BasePDF(FPDF):
    doc_title = ""
    doc_subtitle = ""
    company_name = ""

    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(100, 100, 100)
        left = self.company_name if self.company_name else CLIENT_NAME
        self.cell(0, 6, left, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 102, 178)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Ref: {PROJECT_REF}  |  Pag. {self.page_no()}/{{nb}}", align="C")

    def add_cover(self, title, subtitle, extra_lines=None):
        self.add_page()
        self.ln(50)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(0, 51, 102)
        self.multi_cell(0, 12, title, align="C")
        self.ln(8)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(80, 80, 80)
        self.multi_cell(0, 8, subtitle, align="C")
        if extra_lines:
            self.ln(10)
            self.set_font("Helvetica", "", 11)
            for line in extra_lines:
                self.cell(0, 7, line, new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(20)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 7, f"Referencia: {PROJECT_REF}", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 7, "Fecha: Febrero 2025", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 7, "Clasificacion: CONFIDENCIAL", new_x="LMARGIN", new_y="NEXT", align="C")

    def section_title(self, num, title):
        self.ln(6)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(0, 51, 102)
        self.cell(0, 10, f"{num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 102, 178)
        self.line(10, self.get_y(), 80, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(51, 51, 51)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bullet_list(self, items):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        for item in items:
            self.cell(8)
            self.cell(0, 6, f"  - {item}", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def add_table(self, headers, rows, col_widths=None, total_row=False):
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)
        # header
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(0, 51, 102)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()
        # rows
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        fill = False
        for ri, row in enumerate(rows):
            is_total = total_row and ri == len(rows) - 1
            if is_total:
                self.set_font("Helvetica", "B", 9)
                self.set_fill_color(230, 240, 250)
            else:
                self.set_fill_color(245, 245, 245) if fill else self.set_fill_color(255, 255, 255)
            for i, val in enumerate(row):
                align = "R" if i > 0 and any(c.isdigit() for c in str(val)) else "L"
                self.cell(col_widths[i], 6.5, str(val), border=1, fill=True if is_total or fill else False, align=align)
            self.ln()
            fill = not fill
        self.ln(4)


def fmt(n):
    """Format number as European currency string."""
    return f"{n:,.2f} EUR".replace(",", "X").replace(".", ",").replace("X", ".")


# ─── RFP GENERATORS ──────────────────────────────────────────────────────────

def generate_rfp_tecnica():
    pdf = BasePDF()
    pdf.alias_nb_pages()
    pdf.add_cover(
        "RFP - Requisitos Tecnicos",
        PROJECT_NAME,
        [f"Entidad Contratante: {CLIENT_NAME}", "Departamento de Ingenieria y Proyectos"],
    )

    # TOC
    pdf.add_page()
    pdf.section_title("", "Indice de Contenidos")
    toc = [
        "1. Introduccion y Objeto del Proyecto",
        "2. Alcance de los Trabajos",
        "3. Requisitos Tecnicos Generales",
        "4. Ingenieria de Proceso",
        "5. Ingenieria de Detalle",
        "6. Requisitos de Equipos y Materiales",
        "7. Plan de Ejecucion del Proyecto",
        "8. Requisitos de Personal y Organizacion",
        "9. Sistema de Gestion de Calidad",
        "10. Documentacion Entregable",
        "11. Criterios de Evaluacion Tecnica",
    ]
    pdf.bullet_list(toc)

    pdf.add_page()
    pdf.section_title("1", "Introduccion y Objeto del Proyecto")
    pdf.body_text(
        f"{CLIENT_NAME} invita a presentar oferta tecnica para la ejecucion de la Fase FEED "
        "(Front-End Engineering Design) de una Planta de Procesamiento de Gas Natural con capacidad "
        "nominal de 500 MMSCFD, ubicada en la provincia de Tarragona. El proyecto contempla el diseno "
        "de las unidades de tratamiento de gas, deshidratacion, endulzamiento, fraccionamiento de NGL "
        "y las instalaciones auxiliares asociadas."
    )
    pdf.body_text(
        "El alcance del FEED incluye la elaboracion de toda la documentacion de ingenieria necesaria "
        "para permitir la posterior ejecucion EPC del proyecto, incluyendo estimacion de costes Clase III "
        "(+/- 15%), cronograma de ejecucion detallado y analisis de riesgos del proyecto."
    )

    pdf.section_title("2", "Alcance de los Trabajos")
    pdf.sub_title("2.1 Unidades de Proceso")
    pdf.bullet_list([
        "Unidad de Recepcion y Medicion de Gas (Slug Catcher, Separadores)",
        "Unidad de Endulzamiento con Aminas (MDEA)",
        "Unidad de Regeneracion de Aminas y Tratamiento de Gas Acido (SRU/TGTU)",
        "Unidad de Deshidratacion con TEG",
        "Unidad de Recuperacion de NGL (Turbo-Expander)",
        "Unidad de Fraccionamiento (Deetanizadora, Despropanizadora, Desbutanizadora)",
        "Sistema de Gas Combustible y Antorcha",
        "Almacenamiento y Expedicion de Productos",
    ])
    pdf.sub_title("2.2 Instalaciones Auxiliares")
    pdf.bullet_list([
        "Sistema de Agua de Refrigeracion (Torres de Enfriamiento)",
        "Sistema de Aire de Instrumentos y Planta",
        "Sistema de Generacion de Vapor",
        "Subestacion Electrica y Distribucion",
        "Sistema de Proteccion Contra Incendios",
        "Edificios: Sala de Control, Subestacion, Talleres, Almacen",
    ])

    pdf.sub_title("2.3 Composicion del Gas de Alimentacion")
    pdf.body_text(
        "La composicion tipica del gas de alimentacion a la planta es la siguiente. "
        "El contratista debera verificar estos datos y realizar analisis de sensibilidad "
        "para el rango de composiciones esperado durante la vida util de la planta."
    )
    pdf.add_table(
        ["Componente", "Formula", "% Molar (tipico)", "Rango (min-max)"],
        [
            ["Metano", "CH4", "82.5", "78.0 - 86.0"],
            ["Etano", "C2H6", "6.8", "5.0 - 8.5"],
            ["Propano", "C3H8", "3.2", "2.0 - 4.5"],
            ["i-Butano", "i-C4H10", "0.8", "0.3 - 1.2"],
            ["n-Butano", "n-C4H10", "0.6", "0.2 - 1.0"],
            ["Pentanos+", "C5+", "0.4", "0.1 - 0.8"],
            ["Dioxido de carbono", "CO2", "2.1", "1.0 - 4.0"],
            ["Acido sulfhidrico", "H2S", "1.5", "0.5 - 3.0"],
            ["Nitrogeno", "N2", "1.8", "1.0 - 3.0"],
            ["Agua", "H2O", "Saturado", "Saturado"],
        ],
        col_widths=[55, 30, 50, 55],
    )
    pdf.body_text(
        "Condiciones de entrada del gas:\n"
        "- Presion: 70 barg (rango operativo: 55-75 barg)\n"
        "- Temperatura: 35 C (rango: 15-45 C)\n"
        "- Caudal de diseno: 500 MMSCFD (14.2 MSm3/d)\n"
        "- Caudal maximo: 550 MMSCFD (turn-up 110%)\n"
        "- Caudal minimo de turndown: 250 MMSCFD (50%)"
    )

    pdf.add_page()
    pdf.section_title("3", "Requisitos Tecnicos Generales")
    pdf.body_text(
        "La ingenieria debera desarrollarse conforme a los siguientes codigos y estandares internacionales, "
        "asi como la normativa espanola aplicable:"
    )
    pdf.bullet_list([
        "ASME B31.3 - Process Piping",
        "ASME Section VIII - Pressure Vessels",
        "API 610 - Centrifugal Pumps",
        "API 617 - Axial and Centrifugal Compressors",
        "API 650 / API 620 - Storage Tanks",
        "IEC 61511 - Safety Instrumented Systems",
        "IEC 61850 - Communication Networks in Substations",
        "NFPA 30 - Flammable and Combustible Liquids Code",
        "Real Decreto 840/2015 - Reglamento de seguridad industrial",
        "CTE y normas UNE aplicables",
    ])
    pdf.sub_title("3.1 Condiciones de Diseno")
    pdf.add_table(
        ["Parametro", "Valor", "Unidad"],
        [
            ["Temperatura ambiente maxima", "42", "C"],
            ["Temperatura ambiente minima", "-3", "C"],
            ["Velocidad del viento de diseno", "150", "km/h"],
            ["Zona sismica", "Zona 2 (ag=0.08g)", "-"],
            ["Clasificacion electrica", "Zona 1 / Zona 2 ATEX", "-"],
            ["Vida util de diseno", "30", "anos"],
        ],
        col_widths=[80, 60, 50],
    )

    pdf.add_page()
    pdf.section_title("4", "Ingenieria de Proceso")
    pdf.body_text(
        "El contratista debera desarrollar la ingenieria de proceso completa, incluyendo:"
    )
    pdf.bullet_list([
        "Simulacion de proceso (Aspen HYSYS o equivalente validado)",
        "Diagramas de Flujo de Proceso (PFD) con balances de masa y energia",
        "Diagramas de Tuberias e Instrumentacion (P&ID) conforme a ISA 5.1",
        "Hojas de datos de equipos de proceso",
        "Filosofia de control de proceso",
        "Estudio de HAZOP (al menos 2 sesiones formales con cliente)",
        "Analisis SIL conforme a IEC 61511",
        "Estudio de alivio y venteo (API 521)",
        "Estudios de hidraulica de lineas",
    ])

    pdf.section_title("5", "Ingenieria de Detalle")
    pdf.body_text(
        "Se requiere el desarrollo de la ingenieria de detalle de las siguientes disciplinas a nivel FEED:"
    )
    pdf.sub_title("5.1 Civil y Estructural")
    pdf.bullet_list([
        "Estudio geotecnico y topografico del emplazamiento",
        "Diseno de cimentaciones para equipos principales",
        "Estructuras metalicas de soporte de tuberias (pipe racks)",
        "Viales, drenajes y urbanizacion del plot plan",
    ])
    pdf.sub_title("5.2 Mecanica y Tuberias")
    pdf.bullet_list([
        "Especificaciones de materiales de tuberias (Piping Classes)",
        "Routing de tuberias 3D (PDMS/E3D o SmartPlant 3D)",
        "Analisis de flexibilidad de lineas criticas",
        "Especificaciones de equipos rotativos y estaticos",
    ])
    pdf.sub_title("5.3 Electricidad e Instrumentacion")
    pdf.bullet_list([
        "Estudio de cargas electricas y dimensionamiento de transformadores",
        "Diagramas unifilares y de distribucion",
        "Clasificacion de areas peligrosas (ATEX)",
        "Arquitectura del Sistema de Control Distribuido (DCS)",
        "Arquitectura del Sistema Instrumentado de Seguridad (SIS)",
    ])

    pdf.add_page()
    pdf.section_title("6", "Requisitos de Equipos y Materiales")
    pdf.body_text(
        "Se requiere que el contratista desarrolle las especificaciones de compra para los equipos principales. "
        "Debera presentar una lista de vendedores aprobados para cada tipo de equipo y realizar un minimo de "
        "3 consultas tecnicas por equipo critico."
    )
    pdf.add_table(
        ["Equipo", "Cantidad", "Criticidad"],
        [
            ["Compresor de gas (centrifugo)", "3", "Alta"],
            ["Columna de absorcion aminas", "2", "Alta"],
            ["Turbo-expander", "2", "Alta"],
            ["Torres de fraccionamiento", "3", "Media"],
            ["Intercambiadores de calor", "25+", "Media"],
            ["Bombas de proceso", "40+", "Media"],
            ["Recipientes a presion", "15+", "Media"],
            ["Torres de enfriamiento", "2", "Baja"],
        ],
        col_widths=[90, 40, 60],
    )

    pdf.section_title("7", "Plan de Ejecucion del Proyecto")
    pdf.body_text(
        "El contratista debera presentar un Plan de Ejecucion del Proyecto (PEP) que incluya como minimo:"
    )
    pdf.bullet_list([
        "Organigrama del proyecto con roles y responsabilidades",
        "WBS (Work Breakdown Structure) a nivel 4",
        "Cronograma detallado en MS Project o Primavera P6",
        "Plan de hitos y entregables por disciplina",
        "Plan de gestion de riesgos del proyecto",
        "Plan de comunicaciones y reuniones de seguimiento",
        "Procedimiento de gestion de cambios",
    ])
    pdf.body_text(
        "La duracion estimada de la fase FEED es de 9-12 meses desde la orden de proceder (NTP). "
        "El contratista debera demostrar capacidad para cumplir este plazo con un plan realista."
    )

    pdf.add_page()
    pdf.section_title("8", "Requisitos de Personal y Organizacion")
    pdf.body_text("Se requiere que el equipo clave del proyecto incluya como minimo los siguientes perfiles:")
    pdf.add_table(
        ["Rol", "Experiencia Minima", "Dedicacion"],
        [
            ["Director de Proyecto", "15 anos, 3 proyectos FEED similares", "100%"],
            ["Jefe de Ingenieria de Proceso", "12 anos en gas processing", "100%"],
            ["Jefe de Ingenieria Mecanica", "10 anos en oil & gas", "80%"],
            ["Jefe de Instrumentacion y Control", "10 anos, exp. DCS/SIS", "80%"],
            ["Jefe de Ingenieria Electrica", "10 anos, exp. alta tension", "60%"],
            ["Jefe de Ingenieria Civil", "8 anos en plantas industriales", "60%"],
            ["Coordinador HSE", "10 anos, NEBOSH certificado", "50%"],
            ["Responsable de Calidad", "8 anos, Lead Auditor ISO 9001", "50%"],
        ],
        col_widths=[65, 80, 45],
    )

    pdf.section_title("9", "Sistema de Gestion de Calidad")
    pdf.body_text(
        "El contratista debera disponer de un sistema de gestion de calidad certificado conforme a ISO 9001:2015. "
        "Se requiere un Plan de Calidad especifico del proyecto que incluya: procedimientos de revision de documentos, "
        "control de cambios, auditorias internas y gestion de no conformidades."
    )

    pdf.section_title("10", "Documentacion Entregable")
    pdf.body_text("La documentacion entregable incluira como minimo:")
    pdf.bullet_list([
        "Design Basis Memorandum (DBM)",
        "Informe FEED completo con todos los entregables por disciplina",
        "Estimacion de costes Clase III con desglose por WBS",
        "Cronograma de ejecucion EPC",
        "Informe de HAZOP y respuestas",
        "Paquetes de consulta de equipos de largo plazo de entrega",
        "Modelo 3D del plot plan y pipe racks principales",
        "Informe de constructibilidad",
    ])

    pdf.add_page()
    pdf.section_title("11", "Criterios de Evaluacion Tecnica")
    pdf.body_text("Las ofertas tecnicas seran evaluadas conforme a los siguientes criterios y pesos:")
    pdf.add_table(
        ["Criterio", "Peso (%)", "Descripcion"],
        [
            ["Experiencia y referencias", "20", "Proyectos similares ultimos 10 anos"],
            ["Equipo de proyecto", "15", "Cualificacion y experiencia del equipo clave"],
            ["Metodologia y plan de ejecucion", "20", "Coherencia y realismo del PEP"],
            ["Capacidad tecnica", "25", "Herramientas, tecnologias, know-how"],
            ["Plazo de ejecucion", "10", "Cumplimiento del plazo objetivo"],
            ["Plan de calidad", "10", "Sistema QA/QC propuesto"],
        ],
        col_widths=[60, 25, 105],
    )

    path = os.path.join(BASE_DIR, "RFP", "01_RFP_Tecnica.pdf")
    pdf.output(path)
    return path


def generate_rfp_economica():
    pdf = BasePDF()
    pdf.alias_nb_pages()
    pdf.add_cover(
        "RFP - Requisitos Economicos",
        PROJECT_NAME,
        [f"Entidad Contratante: {CLIENT_NAME}", "Departamento de Compras y Contratacion"],
    )

    pdf.add_page()
    pdf.section_title("1", "Instrucciones para la Oferta Economica")
    pdf.body_text(
        "Los licitadores deberan presentar su oferta economica conforme a las instrucciones y formatos "
        "descritos en este documento. Cualquier desviacion respecto al formato solicitado podra resultar "
        "en la exclusion de la oferta del proceso de evaluacion."
    )
    pdf.body_text(
        "La oferta economica debe presentarse en Euros (EUR) e incluir todos los conceptos necesarios "
        "para la completa ejecucion del alcance descrito en la RFP Tecnica (Ref: 01_RFP_Tecnica). "
        "Los precios deben ser firmes y no revisables durante el periodo de validez de la oferta (90 dias)."
    )

    pdf.section_title("2", "Estructura de Precios - CAPEX")
    pdf.body_text(
        "El desglose de CAPEX debe seguir estrictamente la siguiente estructura de partidas principales. "
        "Cada partida debe desglosarse en sub-partidas segun se indica:"
    )
    pdf.sub_title("2.1 Ingenieria")
    pdf.bullet_list([
        "Ingenieria de Proceso (simulacion, PFD, P&ID, datasheets)",
        "Ingenieria Mecanica (tuberias, recipientes, equipos rotativos)",
        "Ingenieria de Instrumentacion y Control (DCS, SIS, instrumentos)",
        "Ingenieria Electrica (subestacion, distribucion, alumbrado)",
        "Ingenieria Civil y Estructural (cimentaciones, estructuras, viales)",
        "Gestion de Proyecto (PMO, planificacion, control de costes)",
    ])
    pdf.sub_title("2.2 Procura")
    pdf.bullet_list([
        "Equipos de proceso principales (compresores, columnas, intercambiadores)",
        "Materiales de tuberias (tuberia, valvulas, accesorios)",
        "Instrumentacion (transmisores, valvulas de control, analizadores)",
        "Material electrico (cables, bandejas, aparamenta)",
        "Material civil (acero estructural, hormigon, pernos)",
        "Transporte y logistica a obra",
    ])
    pdf.sub_title("2.3 Construccion")
    pdf.bullet_list([
        "Obras civiles (movimiento de tierras, cimentaciones, edificios)",
        "Montaje mecanico (equipos, tuberias, estructuras)",
        "Montaje electrico e instrumentacion",
        "Aislamiento y pintura",
        "Instalaciones temporales de obra",
    ])
    pdf.sub_title("2.4 Commissioning y Puesta en Marcha")
    pdf.bullet_list([
        "Pre-commissioning (pruebas hidrostaticas, limpieza, soplado)",
        "Commissioning mecanico",
        "Commissioning de sistemas de control",
        "Asistencia a puesta en marcha (primeros 3 meses)",
    ])

    pdf.add_page()
    pdf.section_title("3", "Estructura de Precios - OPEX")
    pdf.body_text(
        "Se requiere una estimacion de costes operativos anuales para el primer ano de operacion "
        "de la planta. Esta estimacion sera utilizada en el analisis de ciclo de vida del proyecto."
    )
    pdf.sub_title("3.1 Personal de Operacion y Mantenimiento")
    pdf.bullet_list([
        "Personal de operacion (turnos, supervision, laboratorio)",
        "Personal de mantenimiento (mecanico, electrico, instrumentacion)",
        "Personal de soporte (almacen, administracion, HSE)",
    ])
    pdf.sub_title("3.2 Mantenimiento y Repuestos")
    pdf.bullet_list([
        "Mantenimiento preventivo programado",
        "Stock de repuestos criticos (primer ano)",
        "Contratos de mantenimiento con fabricantes OEM",
    ])
    pdf.sub_title("3.3 Consumibles y Servicios")
    pdf.bullet_list([
        "Productos quimicos (aminas, glicol, inhibidores)",
        "Catalizadores",
        "Utilities (agua, electricidad de red, gas combustible)",
    ])
    pdf.sub_title("3.4 Seguros")
    pdf.bullet_list([
        "Seguro de responsabilidad civil",
        "Seguro de danos materiales y perdida de beneficios",
        "Seguro de montaje (durante construccion)",
    ])

    pdf.add_page()
    pdf.section_title("4", "Formato de Presentacion")
    pdf.body_text("La oferta economica debe incluir las siguientes tablas cumplimentadas:")
    pdf.sub_title("Tabla A - Resumen CAPEX")
    pdf.add_table(
        ["Partida", "Importe (EUR)", "% sobre Total"],
        [
            ["A.1 Ingenieria", "[A completar]", "[A completar]"],
            ["A.2 Procura", "[A completar]", "[A completar]"],
            ["A.3 Construccion", "[A completar]", "[A completar]"],
            ["A.4 Commissioning", "[A completar]", "[A completar]"],
            ["SUBTOTAL CAPEX", "[A completar]", "100%"],
            ["IVA (21%)", "[A completar]", "-"],
            ["TOTAL CAPEX (IVA incl.)", "[A completar]", "-"],
        ],
        col_widths=[80, 60, 50],
        total_row=True,
    )
    pdf.sub_title("Tabla B - Resumen OPEX Anual")
    pdf.add_table(
        ["Partida", "Importe Anual (EUR)", "% sobre Total"],
        [
            ["B.1 Personal", "[A completar]", "[A completar]"],
            ["B.2 Mantenimiento", "[A completar]", "[A completar]"],
            ["B.3 Consumibles", "[A completar]", "[A completar]"],
            ["B.4 Seguros", "[A completar]", "[A completar]"],
            ["SUBTOTAL OPEX", "[A completar]", "100%"],
            ["IVA (21%)", "[A completar]", "-"],
            ["TOTAL OPEX ANUAL (IVA incl.)", "[A completar]", "-"],
        ],
        col_widths=[80, 60, 50],
        total_row=True,
    )

    pdf.add_page()
    pdf.section_title("5", "Condiciones Comerciales")
    pdf.sub_title("5.1 Condiciones de Pago")
    pdf.body_text(
        "El esquema de pago propuesto por la Propiedad es el siguiente:\n"
        "- 10% a la firma del contrato (anticipo contra aval bancario)\n"
        "- 20% al completar ingenieria basica (hito: aprobacion PFDs)\n"
        "- 30% al completar ingenieria de detalle (hito: IFC)\n"
        "- 25% durante construccion (certificaciones mensuales)\n"
        "- 10% al completar mechanical completion\n"
        "- 5% al completar performance test (retencion de garantia)"
    )
    pdf.sub_title("5.2 Penalizaciones")
    pdf.body_text(
        "Se aplicaran penalizaciones por retraso en la entrega de los hitos principales del proyecto:\n"
        "- 0,1% del valor del contrato por cada dia de retraso, hasta un maximo del 10%.\n"
        "- Los retrasos superiores a 90 dias daran derecho a la resolucion del contrato."
    )
    pdf.sub_title("5.3 Garantias")
    pdf.body_text(
        "El contratista debera proveer:\n"
        "- Aval bancario de buen fin de obra por el 10% del valor del contrato\n"
        "- Garantia de calidad de la ingenieria: 24 meses desde entrega del FEED\n"
        "- Seguro de responsabilidad civil profesional: minimo 5M EUR"
    )

    pdf.section_title("6", "Modelo Contractual")
    pdf.body_text(
        "El contrato se formalizara bajo la modalidad de precio cerrado (Lump Sum) para la fase de ingenieria "
        "FEED, y precios unitarios reembolsables (Reimbursable) para la asistencia durante la construccion. "
        "Se aplicaran las siguientes clausulas contractuales:"
    )
    pdf.bullet_list([
        "Ley aplicable: legislacion espanola",
        "Jurisdiccion: tribunales de Madrid",
        "Arbitraje: Camara de Comercio de Madrid (si aplica)",
        "Idioma del contrato: espanol (version prevalente si bilingue)",
        "Moneda: Euro (EUR)",
        "Clausula de fuerza mayor conforme al Codigo Civil espanol",
        "Clausula de resolucion por incumplimiento grave (con preaviso de 30 dias)",
    ])

    pdf.sub_title("6.1 Tabla de Penalizaciones por Retraso")
    pdf.add_table(
        ["Hito", "Plazo Maximo", "Penalizacion Diaria", "Penalizacion Maxima"],
        [
            ["Aprobacion Design Basis", "Mes 2", "0.05% del contrato", "2%"],
            ["Entrega PFDs aprobados", "Mes 4", "0.05% del contrato", "3%"],
            ["Entrega P&IDs IFC", "Mes 8", "0.10% del contrato", "5%"],
            ["Entrega Informe FEED completo", "Mes 11", "0.10% del contrato", "5%"],
            ["Acumulado maximo", "-", "-", "10% del contrato"],
        ],
        col_widths=[55, 30, 50, 55],
        total_row=True,
    )

    pdf.sub_title("6.2 Requisitos de Garantias Bancarias")
    pdf.add_table(
        ["Tipo de Garantia", "Importe", "Validez", "Entidad Aceptable"],
        [
            ["Aval de buen fin de obra", "10% del contrato", "Hasta MC + 12 meses", "Banco top-20 Espana"],
            ["Devolucion de anticipo", "100% del anticipo", "Hasta amortizacion total", "Banco top-20 Espana"],
            ["Retencion de garantia", "5% del contrato", "Hasta Performance Test", "Retencion directa"],
        ],
        col_widths=[50, 40, 50, 50],
    )

    pdf.sub_title("6.3 Formulas de Revision de Precios")
    pdf.body_text(
        "Para la partida de construccion, se aplicara la siguiente formula de revision de precios "
        "en caso de extension del plazo superior a 6 meses por causa no imputable al contratista:\n\n"
        "P_rev = P_base x (0.15 + 0.40 x S1/S0 + 0.30 x M1/M0 + 0.15 x E1/E0)\n\n"
        "Donde:\n"
        "- S1/S0: Indice de salarios del sector construccion (INE)\n"
        "- M1/M0: Indice de precios de materiales siderurgicos (INE)\n"
        "- E1/E0: Indice de precios de la energia (INE)\n"
        "- 0.15: Componente fijo no revisable"
    )

    pdf.add_page()
    pdf.section_title("7", "Criterios de Evaluacion Economica")
    pdf.add_table(
        ["Criterio", "Peso (%)", "Descripcion"],
        [
            ["Precio total CAPEX", "40", "Valor absoluto de la oferta CAPEX"],
            ["Precio total OPEX", "15", "Estimacion coste anual operacion"],
            ["Condiciones de pago", "15", "Flexibilidad en esquema de pagos"],
            ["Garantias ofrecidas", "15", "Alcance y duracion de garantias"],
            ["Coste ciclo de vida (LCC)", "15", "CAPEX + 10 x OPEX anual"],
        ],
        col_widths=[55, 25, 110],
    )

    path = os.path.join(BASE_DIR, "RFP", "02_RFP_Economica.pdf")
    pdf.output(path)
    return path


def generate_rfp_compliance():
    pdf = BasePDF()
    pdf.alias_nb_pages()
    pdf.add_cover(
        "RFP - Requisitos de Compliance, HSE y Medioambiente",
        PROJECT_NAME,
        [f"Entidad Contratante: {CLIENT_NAME}", "Departamento de HSE y Sostenibilidad"],
    )

    pdf.add_page()
    pdf.section_title("1", "Introduccion")
    pdf.body_text(
        f"{CLIENT_NAME} exige el cumplimiento de los mas altos estandares de seguridad, salud, "
        "medioambiente y compliance etico en todos sus proyectos. El presente documento establece "
        "los requisitos minimos que deberan cumplir los licitadores y sus subcontratistas."
    )

    pdf.section_title("2", "Requisitos de Seguridad y Salud (HSE)")
    pdf.sub_title("2.1 Sistema de Gestion de Seguridad")
    pdf.body_text(
        "El contratista debera disponer de un sistema de gestion de seguridad y salud certificado "
        "conforme a ISO 45001:2018 (o OHSAS 18001 en periodo de transicion). Se requiere:"
    )
    pdf.bullet_list([
        "Politica de seguridad firmada por la alta direccion",
        "Manual de seguridad del proyecto",
        "Plan de Seguridad y Salud especifico para las obras",
        "Procedimientos de trabajo seguro para actividades criticas",
        "Programa de formacion en seguridad para todo el personal",
        "Registro de accidentes e incidentes de los ultimos 5 anos",
    ])
    pdf.sub_title("2.2 Indicadores de Seguridad Requeridos")
    pdf.add_table(
        ["Indicador", "Requisito Maximo", "Periodo"],
        [
            ["TRIR (Total Recordable Incident Rate)", "< 0.50", "Ultimos 3 anos"],
            ["LTIR (Lost Time Incident Rate)", "< 0.15", "Ultimos 3 anos"],
            ["DART Rate", "< 0.30", "Ultimos 3 anos"],
            ["Fatalidades", "0", "Ultimos 10 anos"],
            ["Horas de formacion HSE", "> 40 h/empleado/ano", "Ultimo ano"],
        ],
        col_widths=[80, 60, 50],
    )

    pdf.add_page()
    pdf.section_title("3", "Requisitos Medioambientales")
    pdf.sub_title("3.1 Sistema de Gestion Ambiental")
    pdf.body_text(
        "Se requiere certificacion ISO 14001:2015. El contratista debera presentar:"
    )
    pdf.bullet_list([
        "Plan de Gestion Ambiental del proyecto",
        "Estudio de Impacto Ambiental (EIA) o declaracion ambiental",
        "Plan de gestion de residuos (segregacion, transporte, tratamiento)",
        "Plan de prevencion de vertidos y derrames",
        "Inventario de emisiones atmosfericas previstas",
        "Plan de restauracion ambiental post-obra",
    ])
    pdf.sub_title("3.2 Objetivos de Sostenibilidad")
    pdf.body_text(
        "El proyecto se alinea con los ODS de Naciones Unidas y los compromisos ESG del cliente. "
        "Se valoraran especialmente:"
    )
    pdf.bullet_list([
        "Reduccion de huella de carbono en fase de construccion",
        "Uso de materiales reciclados o de bajo impacto",
        "Minimizacion de residuos a vertedero (objetivo: < 10%)",
        "Eficiencia energetica en edificios e instalaciones",
        "Plan de economia circular para residuos de construccion",
    ])

    pdf.section_title("4", "Requisitos de Compliance y Etica")
    pdf.sub_title("4.1 Codigo Etico y Anti-corrupcion")
    pdf.body_text(
        "El contratista debera adherirse al Codigo Etico del cliente y demostrar cumplimiento con:"
    )
    pdf.bullet_list([
        "Ley Organica 1/2015 de responsabilidad penal de personas juridicas",
        "UK Bribery Act 2010 (si aplica por alcance internacional)",
        "FCPA - Foreign Corrupt Practices Act (si aplica)",
        "Programa de compliance penal propio del contratista",
        "Canal de denuncias interno operativo",
        "Formacion anti-corrupcion para todo el personal clave",
    ])

    pdf.add_page()
    pdf.sub_title("4.2 Derechos Humanos y Cadena de Suministro")
    pdf.body_text("El contratista debera garantizar:")
    pdf.bullet_list([
        "Cumplimiento de la Declaracion Universal de Derechos Humanos",
        "Prohibicion de trabajo infantil y trabajo forzoso en toda la cadena",
        "Due diligence de proveedores y subcontratistas",
        "Igualdad de oportunidades y no discriminacion",
        "Derecho a la negociacion colectiva",
    ])
    pdf.sub_title("4.3 Proteccion de Datos")
    pdf.body_text(
        "Cumplimiento del Reglamento General de Proteccion de Datos (RGPD) y la Ley Organica 3/2018 (LOPDGDD). "
        "Se requiere designacion de un DPO si el contratista maneja datos personales del proyecto."
    )

    pdf.section_title("5", "Requisitos de Formacion y Capacitacion HSE")
    pdf.body_text(
        "El contratista debera implementar un programa de formacion HSE que cumpla los siguientes "
        "requisitos minimos para todo el personal asignado al proyecto:"
    )
    pdf.add_table(
        ["Formacion", "Personal Objetivo", "Horas Minimas", "Frecuencia"],
        [
            ["Induccion HSE del proyecto", "Todo el personal", "8h", "Al incorporarse"],
            ["Formacion especifica de riesgos", "Personal de obra", "4h", "Trimestral"],
            ["Trabajos en altura", "Personal expuesto", "8h", "Anual"],
            ["Espacios confinados", "Personal expuesto", "8h", "Anual"],
            ["Manejo sustancias peligrosas", "Personal expuesto", "4h", "Semestral"],
            ["Primeros auxilios", "Min. 10% plantilla", "16h", "Anual"],
            ["Lucha contra incendios", "Todo personal obra", "4h", "Semestral"],
            ["Liderazgo en seguridad", "Mandos y supervisores", "16h", "Anual"],
        ],
        col_widths=[55, 45, 35, 55],
    )

    pdf.sub_title("5.1 Requisitos de Auditorias")
    pdf.body_text(
        "El cliente se reserva el derecho de realizar auditorias sin previo aviso de las instalaciones, "
        "procedimientos y registros HSE del contratista. Adicionalmente, se programaran las siguientes "
        "auditorias:"
    )
    pdf.add_table(
        ["Tipo de Auditoria", "Frecuencia", "Realizada por", "Alcance"],
        [
            ["Auditoria HSE interna", "Mensual", "Contratista", "Procedimientos y registros"],
            ["Inspeccion HSE de obra", "Semanal", "Contratista + Cliente", "Condiciones de obra"],
            ["Auditoria ISO 45001", "Anual", "Organismo certificador", "Sistema de gestion"],
            ["Auditoria medioambiental", "Trimestral", "Contratista", "Gestion residuos, emisiones"],
            ["Auditoria de compliance", "Semestral", "Contratista + externo", "Programa anticorrupcion"],
        ],
        col_widths=[50, 35, 50, 55],
    )

    pdf.add_page()
    pdf.section_title("6", "Requisitos Legales y Normativos")
    pdf.body_text("El contratista debera cumplir con toda la normativa aplicable, incluyendo:")
    pdf.bullet_list([
        "Ley 31/1995 de Prevencion de Riesgos Laborales",
        "RD 1627/1997 - Seguridad y Salud en obras de construccion",
        "Ley 22/2011 de Residuos y Suelos Contaminados",
        "Ley 26/2007 de Responsabilidad Medioambiental",
        "Directiva 2012/18/UE (Seveso III) si aplica",
        "Reglamento REACH para sustancias quimicas",
        "Real Decreto 840/2015 de seguridad industrial",
    ])

    pdf.section_title("6", "Documentacion Requerida del Licitador")
    pdf.body_text("Se debera adjuntar a la oferta la siguiente documentacion de compliance:")
    pdf.add_table(
        ["Documento", "Obligatorio", "Formato"],
        [
            ["Certificado ISO 45001 / OHSAS 18001", "Si", "Copia certificada"],
            ["Certificado ISO 14001", "Si", "Copia certificada"],
            ["Estadisticas de accidentabilidad (3 anos)", "Si", "Formato libre"],
            ["Programa de compliance penal", "Si", "Copia del programa"],
            ["Plan HSE generico de la empresa", "Si", "PDF"],
            ["Certificado ISO 50001 (eficiencia energetica)", "No (valorable)", "Copia certificada"],
            ["Informe de sostenibilidad / ESG", "No (valorable)", "PDF"],
            ["Politica de derechos humanos", "Si", "PDF"],
        ],
        col_widths=[80, 40, 70],
    )

    pdf.add_page()
    pdf.section_title("7", "Criterios de Evaluacion de Compliance")
    pdf.add_table(
        ["Criterio", "Peso (%)", "Descripcion"],
        [
            ["Sistema de gestion HSE", "30", "Certificaciones, indicadores, plan de seguridad"],
            ["Gestion medioambiental", "25", "Certificaciones, plan ambiental, sostenibilidad"],
            ["Compliance etico y legal", "20", "Programa compliance, anti-corrupcion, RGPD"],
            ["Experiencia en HSE", "15", "Track record de seguridad en proyectos similares"],
            ["Innovacion en sostenibilidad", "10", "Propuestas de valor anadido en ESG"],
        ],
        col_widths=[60, 25, 105],
    )

    path = os.path.join(BASE_DIR, "RFP", "03_RFP_Compliance.pdf")
    pdf.output(path)
    return path


# ─── SUPPLIER OFFER GENERATORS ───────────────────────────────────────────────

def generate_oferta_tecnica(supplier_key):
    s = SUPPLIERS[supplier_key]
    pdf = BasePDF()
    pdf.company_name = s["nombre"]
    pdf.alias_nb_pages()
    pdf.add_cover(
        "Oferta Tecnica",
        PROJECT_NAME,
        [
            f"Presentada por: {s['nombre']}",
            f"CIF: {s['cif']}",
            f"Sede: {s['sede']}",
            f"Referencia: {PROJECT_REF}",
        ],
    )

    # Company presentation
    pdf.add_page()
    pdf.section_title("1", "Presentacion de la Empresa")
    pdf.body_text(
        f"{s['nombre']} es una empresa con sede en {s['sede']} y {s['experiencia_anos']} anos de experiencia "
        f"en el sector de ingenieria y construccion industrial. Contamos con una plantilla de {s['empleados']} "
        f"profesionales especializados en proyectos de oil & gas, petroquimica y energia."
    )
    pdf.body_text(f"Nuestro perfil: {s['perfil']}.")
    pdf.sub_title("1.1 Certificaciones")
    pdf.bullet_list(s["cert"])
    pdf.sub_title("1.2 Referencias de Proyectos Similares")
    refs_by_supplier = {
        "Supplier_01": [
            ["FEED Planta GNL Huelva", "Repsol", "2023", "450 MMSCFD", "Completado"],
            ["FEED Ampliacion Refineria", "Cepsa", "2022", "80.000 bpd", "Completado"],
            ["EPC Gas Processing Plant", "Sonatrach", "2021", "200 MMSCFD", "Completado"],
            ["FEED Terminal GNL", "Enagas", "2020", "800.000 m3", "Completado"],
        ],
        "Supplier_02": [
            ["FEED Planta Petroquimica", "BASF", "2023", "Polietileno", "Completado"],
            ["EPC Unidad Fraccionamiento", "Repsol", "2022", "NGL", "Completado"],
            ["FEED Planta Cogeneracion", "Iberdrola", "2021", "50 MW", "Completado"],
        ],
        "Supplier_03": [
            ["FEED Gas Processing", "Saudi Aramco", "2023", "1000 MMSCFD", "Completado"],
            ["EPC Desalination Plant", "ACWA Power", "2022", "100.000 m3/d", "Completado"],
            ["FEED Refinery Expansion", "KPC", "2021", "120.000 bpd", "En curso"],
        ],
        "Supplier_04": [
            ["FEED Planta Hidrogeno Verde", "Iberdrola", "2023", "20 MW", "Completado"],
            ["FEED Terminal GNL Sostenible", "Enagas", "2022", "600.000 m3", "Completado"],
            ["EPC Planta Biometano", "Naturgy", "2021", "5.000 Nm3/h", "Completado"],
            ["FEED Parque Eolico Offshore", "Equinor", "2020", "500 MW", "Completado"],
        ],
    }
    pdf.add_table(
        ["Proyecto", "Cliente", "Ano", "Capacidad", "Estado"],
        refs_by_supplier[supplier_key],
        col_widths=[55, 35, 20, 40, 40],
    )

    # Methodology
    pdf.add_page()
    pdf.section_title("2", "Metodologia y Plan de Ejecucion")
    pdf.body_text(
        f"{s['nombre']} propone la siguiente metodologia para la ejecucion de la fase FEED, "
        "alineada con los requisitos de la RFP Tecnica (Ref: 01_RFP_Tecnica):"
    )
    methodology_by_supplier = {
        "Supplier_01": (
            "Nuestra metodologia se basa en el uso de tecnologias de simulacion avanzada y un enfoque "
            "de ingenieria concurrente que permite la optimizacion del diseno desde las fases iniciales. "
            "Utilizamos Aspen HYSYS v14 para simulacion de proceso, complementado con Aspen Plus para "
            "estudios termodinamicos detallados. El modelo 3D se desarrollara en AVEVA E3D con integracion "
            "directa con las bases de datos de instrumentacion (SmartPlant Instrumentation) y electricidad "
            "(ETAP). Implementaremos un Digital Twin del proceso desde la fase FEED."
        ),
        "Supplier_02": (
            "Proponemos un enfoque pragmatico y eficiente, combinando experiencia probada con herramientas "
            "modernas. La simulacion de proceso se realizara con Aspen HYSYS, y el modelo 3D con PDMS/E3D. "
            "Nuestro valor diferencial es la estrecha colaboracion con el equipo del cliente mediante "
            "workshops quincenales y un portal de proyecto en tiempo real. Garantizamos flexibilidad "
            "para adaptar el alcance a las necesidades cambiantes del proyecto."
        ),
        "Supplier_03": (
            "Aplicaremos nuestra metodologia global estandarizada, optimizada para eficiencia de costes "
            "y plazos. Con centros de ingenieria en 3 continentes, podemos ofrecer un modelo de trabajo "
            "follow-the-sun que acelera los plazos de entrega. Utilizamos Pro/II para simulacion y "
            "SmartPlant 3D para el modelo tridimensional. Nuestra escala nos permite ofrecer tarifas "
            "horarias muy competitivas sin comprometer la calidad tecnica del entregable."
        ),
        "Supplier_04": (
            "Nuestra propuesta tecnica integra la sostenibilidad como pilar fundamental de la ingenieria. "
            "Ademas de las herramientas estandar (Aspen HYSYS, AVEVA E3D), incorporamos analisis de ciclo "
            "de vida (LCA) en cada decision de diseno, optimizacion energetica avanzada con pinch analysis, "
            "y evaluacion de huella de carbono del proyecto. Proponemos la integracion de energias renovables "
            "para autoconsumo en las instalaciones auxiliares de la planta."
        ),
    }
    pdf.body_text(methodology_by_supplier[supplier_key])

    pdf.sub_title("2.1 Cronograma Propuesto")
    schedules = {
        "Supplier_01": [
            ["Fase 1: Ingenieria Basica", "Meses 1-3", "PFDs, simulacion, Design Basis"],
            ["Fase 2: HAZOP y Revision", "Meses 3-4", "Sesiones HAZOP, SIL study"],
            ["Fase 3: Ingenieria de Detalle FEED", "Meses 4-9", "P&IDs, modelo 3D, datasheets"],
            ["Fase 4: Estimacion y Entregables", "Meses 9-11", "Cost estimate Clase III, informe FEED"],
            ["Duracion Total", "11 meses", "Incluye 1 mes de contingencia"],
        ],
        "Supplier_02": [
            ["Fase 1: Kick-off e Ingenieria Basica", "Meses 1-3", "Arranque, PFDs, Design Basis"],
            ["Fase 2: Desarrollo FEED", "Meses 3-8", "P&IDs, HAZOP, modelo 3D"],
            ["Fase 3: Consolidacion", "Meses 8-10", "Estimacion costes, informe FEED"],
            ["Duracion Total", "10 meses", "Plazo agresivo pero realista"],
        ],
        "Supplier_03": [
            ["Fase 1: Ingenieria Conceptual", "Meses 1-2", "Design Basis, PFDs"],
            ["Fase 2: FEED Core", "Meses 2-7", "P&IDs, HAZOP, detalle"],
            ["Fase 3: Cierre FEED", "Meses 7-9", "Estimacion, entregables finales"],
            ["Duracion Total", "9 meses", "Modelo follow-the-sun"],
        ],
        "Supplier_04": [
            ["Fase 1: Analisis y Diseno Conceptual", "Meses 1-4", "Design Basis, LCA, PFDs"],
            ["Fase 2: Desarrollo FEED", "Meses 4-9", "P&IDs, HAZOP, modelo 3D, pinch analysis"],
            ["Fase 3: Optimizacion y Sostenibilidad", "Meses 9-10", "Optimizacion energetica, LCA final"],
            ["Fase 4: Consolidacion", "Meses 10-12", "Estimacion costes, informe FEED completo"],
            ["Duracion Total", "12 meses", "Incluye optimizacion sostenibilidad"],
        ],
    }
    pdf.add_table(
        ["Fase", "Periodo", "Entregables Clave"],
        schedules[supplier_key],
        col_widths=[65, 35, 90],
    )

    # Technical approach per unit
    pdf.add_page()
    pdf.section_title("3", "Propuesta Tecnica por Unidad de Proceso")
    pdf.sub_title("3.1 Unidad de Endulzamiento (Aminas)")
    pdf.body_text(
        "Se propone un sistema de endulzamiento con MDEA (metildietanolamina) en configuracion "
        "de absorcion-regeneracion con las siguientes caracteristicas de diseno:"
    )
    pdf.bullet_list([
        "Columna de absorcion: 2 unidades en paralelo, 50% capacidad cada una",
        "Carga de amina: 45% en peso MDEA",
        "Temperatura de absorcion: 40 C",
        "Presion de operacion: 65 barg",
        "CO2 residual en gas tratado: < 50 ppmv",
        "H2S residual en gas tratado: < 4 ppmv",
    ])
    pdf.sub_title("3.2 Unidad de Deshidratacion (TEG)")
    pdf.body_text(
        "Sistema de deshidratacion con trietilenglicol (TEG) para alcanzar un punto de rocio de agua "
        "de -25 C a presion de operacion. El sistema incluye contactor, regenerador con gas de stripping, "
        "y sistema de BTEX recovery."
    )
    pdf.sub_title("3.3 Unidad de Recuperacion de NGL")
    pdf.body_text(
        "Se propone un esquema GSP (Gas Subcooled Process) con turbo-expander para maximizar la "
        "recuperacion de C3+ (objetivo > 98% de propano y > 99.5% de C4+). El diseno incluira "
        "analisis de sensibilidad para composiciones variables del gas de alimentacion."
    )

    pdf.add_page()
    pdf.section_title("4", "Equipo de Proyecto Propuesto")
    team_data = {
        "Supplier_01": [
            ["Carlos Martinez", "Director de Proyecto", "22 anos", "PhD Ing. Quimica, PMP", "100%"],
            ["Ana Rodriguez", "Jefa Ing. Proceso", "18 anos", "MSc Ing. Quimica", "100%"],
            ["Miguel Torres", "Jefe Ing. Mecanica", "15 anos", "Ing. Industrial, PE", "80%"],
            ["Laura Sanchez", "Jefa Inst. y Control", "14 anos", "Ing. Electronica, ISA cert.", "80%"],
            ["Pedro Gomez", "Jefe Ing. Electrica", "12 anos", "Ing. Electrica", "60%"],
            ["Isabel Fernandez", "Jefa Ing. Civil", "10 anos", "Ing. Caminos", "60%"],
            ["Ricardo Lopez", "Coordinador HSE", "16 anos", "NEBOSH Diploma", "50%"],
        ],
        "Supplier_02": [
            ["Javier Ruiz", "Director de Proyecto", "18 anos", "Ing. Industrial, PMP", "100%"],
            ["Carmen Vidal", "Jefa Ing. Proceso", "14 anos", "MSc Ing. Quimica", "100%"],
            ["Alberto Marin", "Jefe Ing. Mecanica", "12 anos", "Ing. Mecanico", "80%"],
            ["Sofia Herrero", "Jefa Inst. y Control", "11 anos", "Ing. Electronica", "80%"],
            ["David Moreno", "Jefe Ing. Electrica", "10 anos", "Ing. Electrica", "60%"],
            ["Raquel Diaz", "Coordinadora HSE", "12 anos", "NEBOSH IGC", "50%"],
        ],
        "Supplier_03": [
            ["James Wilson", "Project Director", "20 anos", "MEng Chemical, PMP", "80%"],
            ["Antonio Garcia", "Lead Process Eng.", "15 anos", "Ing. Quimica", "100%"],
            ["Sarah Chen", "Mech. Eng. Lead", "13 anos", "BSc Mechanical Eng.", "60%"],
            ["Ahmed Hassan", "I&C Lead", "11 anos", "BSc Electronics", "60%"],
            ["Maria Perez", "HSE Coordinator", "8 anos", "Tecnico PRL", "40%"],
        ],
        "Supplier_04": [
            ["Elena Navarro", "Directora de Proyecto", "20 anos", "PhD Ing. Industrial, PMP", "100%"],
            ["Pablo Jimenez", "Jefe Ing. Proceso", "16 anos", "MSc Ing. Quimica", "100%"],
            ["Lucia Romero", "Jefa Ing. Mecanica", "13 anos", "Ing. Industrial", "80%"],
            ["Fernando Castillo", "Jefe Inst. y Control", "12 anos", "Ing. Electronica, ISA cert.", "80%"],
            ["Teresa Molina", "Jefa Ing. Electrica", "11 anos", "Ing. Electrica", "70%"],
            ["Ramon Ortega", "Coordinador HSE", "18 anos", "NEBOSH Diploma, CIH", "60%"],
            ["Clara Vega", "Resp. Sostenibilidad", "10 anos", "MSc Medioambiente", "50%"],
        ],
    }
    pdf.add_table(
        ["Nombre", "Rol", "Exp.", "Titulacion", "Ded."],
        team_data[supplier_key],
        col_widths=[40, 45, 22, 55, 28],
    )

    # Tools
    pdf.add_page()
    pdf.section_title("5", "Herramientas y Software")
    tools_all = [
        ["Simulacion de Proceso", "Aspen HYSYS v14", "Licencia corporativa"],
        ["Diseno 3D", "AVEVA E3D / PDMS", "Licencia proyecto"],
        ["Instrumentacion", "SmartPlant Instrumentation", "Licencia corporativa"],
        ["Electrica", "ETAP", "Licencia corporativa"],
        ["Estructural", "STAAD Pro / Tekla", "Licencia corporativa"],
        ["Planificacion", "Primavera P6", "Licencia proyecto"],
        ["Gestion Documental", "Aconex / Wrench", "Licencia proyecto"],
    ]
    pdf.add_table(
        ["Disciplina", "Software", "Licencia"],
        tools_all,
        col_widths=[60, 70, 60],
    )

    pdf.section_title("6", "Plan de Calidad (QA/QC)")
    pdf.body_text(
        f"{s['nombre']} implementara un Plan de Calidad especifico para este proyecto conforme a ISO 9001:2015. "
        "Los entregables pasaran por un proceso de revision en 4 etapas: revision interna por el autor, "
        "revision por el lider de disciplina, revision interdisciplinar (IDC), y aprobacion por el Director "
        "de Proyecto. Se realizaran auditorias internas mensuales del proyecto."
    )
    pdf.sub_title("6.1 Procedimiento de Revision de Documentos")
    pdf.body_text(
        "Cada documento tecnico seguira el siguiente ciclo de vida:\n"
        "- IFR (Issued for Review): Emision interna para revision interdisciplinar\n"
        "- IFA (Issued for Approval): Emision al cliente para aprobacion\n"
        "- IFC (Issued for Construction): Emision final aprobada\n"
        "El plazo maximo de revision interna es de 5 dias habiles. Las revisiones del cliente "
        "se gestionaran a traves del sistema de gestion documental del proyecto."
    )
    pdf.sub_title("6.2 Control de No Conformidades")
    pdf.body_text(
        "Se implementara un sistema de gestion de no conformidades con clasificacion por severidad:\n"
        "- Categoria A (critica): Requiere accion correctiva inmediata y aprobacion del Director de Proyecto.\n"
        "- Categoria B (mayor): Requiere accion correctiva en 5 dias habiles.\n"
        "- Categoria C (menor): Se documenta y se resuelve en la siguiente revision programada."
    )
    pdf.sub_title("6.3 Auditorias de Calidad")
    pdf.add_table(
        ["Tipo de Auditoria", "Frecuencia", "Responsable"],
        [
            ["Auditoria interna del proyecto", "Mensual", "Resp. Calidad"],
            ["Auditoria de disciplina", "Bimestral", "Lider de Disciplina"],
            ["Revision por la Direccion", "Trimestral", "Director de Proyecto"],
            ["Auditoria del cliente", "Segun plan cliente", "Resp. Calidad"],
        ],
        col_widths=[70, 50, 70],
    )

    # Risk Management
    pdf.add_page()
    pdf.section_title("7", "Plan de Gestion de Riesgos")
    pdf.body_text(
        f"{s['nombre']} aplicara una metodologia de gestion de riesgos basada en la norma ISO 31000:2018. "
        "Se mantendra un registro de riesgos vivo durante toda la fase FEED, actualizado semanalmente."
    )
    pdf.sub_title("7.1 Matriz de Riesgos Principales Identificados")
    risk_data = {
        "Supplier_01": [
            ["R-001", "Cambio de normativa durante FEED", "Media", "Alto", "Monitorizacion regulatoria mensual"],
            ["R-002", "Retraso en datos del cliente", "Alta", "Medio", "Protocolo de escalado en 48h"],
            ["R-003", "Variacion composicion gas alimentacion", "Media", "Alto", "Analisis sensibilidad +/- 15%"],
            ["R-004", "Indisponibilidad personal clave", "Baja", "Alto", "Backup identificado para cada rol"],
            ["R-005", "Sobrecarga de trabajo en pico", "Media", "Medio", "Pool de recursos de soporte"],
            ["R-006", "Retrasos en consultas a vendedores", "Media", "Medio", "Pre-engagement de vendedores"],
            ["R-007", "Cambios de alcance no controlados", "Media", "Alto", "Procedimiento MoC estricto"],
        ],
        "Supplier_02": [
            ["R-001", "Retraso en datos del cliente", "Alta", "Medio", "Reuniones semanales de seguimiento"],
            ["R-002", "Variacion composicion gas", "Media", "Alto", "Margenes de diseno conservadores"],
            ["R-003", "Cambio normativo", "Baja", "Medio", "Revision normativa trimestral"],
            ["R-004", "Interferencias con otros proyectos", "Media", "Medio", "Dedicacion garantizada por contrato"],
            ["R-005", "Problemas con modelo 3D", "Baja", "Medio", "Backup en SmartPlant 3D"],
            ["R-006", "Sobrecostes en procura equipos", "Media", "Alto", "Consultas tempranas a 3+ vendedores"],
        ],
        "Supplier_03": [
            ["R-001", "Coordinacion equipos internacionales", "Alta", "Alto", "Reuniones diarias + herramientas cloud"],
            ["R-002", "Barrera idiomatica", "Media", "Medio", "Equipo local bilingue obligatorio"],
            ["R-003", "Diferencias normativas pais origen", "Media", "Alto", "Consultor local normativa espanola"],
            ["R-004", "Retraso datos del cliente", "Media", "Medio", "Protocolo de escalado semanal"],
            ["R-005", "Rotacion personal", "Alta", "Medio", "Pool global de recursos backup"],
        ],
        "Supplier_04": [
            ["R-001", "Complejidad del analisis de sostenibilidad", "Media", "Medio", "Equipo dedicado LCA"],
            ["R-002", "Retraso en datos del cliente", "Alta", "Medio", "Protocolo escalado + workshops"],
            ["R-003", "Variacion composicion gas", "Media", "Alto", "Simulacion Monte Carlo de escenarios"],
            ["R-004", "Nuevos requisitos ESG regulatorios", "Media", "Medio", "Monitorizacion regulatoria continua"],
            ["R-005", "Integracion renovables no viable", "Baja", "Bajo", "Estudio de viabilidad en Fase 1"],
            ["R-006", "Retrasos en procura equipos premium", "Media", "Alto", "Pre-engagement y reserva temprana"],
            ["R-007", "Cambios de alcance", "Media", "Alto", "Comite de cambios semanal"],
        ],
    }
    pdf.add_table(
        ["ID", "Riesgo", "Prob.", "Impacto", "Mitigacion"],
        risk_data[supplier_key],
        col_widths=[15, 55, 20, 20, 80],
    )

    # Communications Plan
    pdf.add_page()
    pdf.section_title("8", "Plan de Comunicaciones")
    pdf.body_text(
        "Se implementara un plan de comunicaciones estructurado para garantizar la coordinacion "
        "efectiva entre el equipo del contratista y el equipo del cliente."
    )
    pdf.add_table(
        ["Reunion", "Frecuencia", "Participantes", "Objetivo"],
        [
            ["Kick-off Meeting", "Unica", "Todos", "Alineacion inicial del proyecto"],
            ["Reunion de Progreso", "Semanal", "PM + leads", "Seguimiento de avance y acciones"],
            ["Reunion de Disciplina", "Quincenal", "Leads + ingenieros", "Revision tecnica detallada"],
            ["Comite de Direccion", "Mensual", "Direccion ambas partes", "Decisiones estrategicas"],
            ["Revision de Riesgos", "Quincenal", "PM + QA", "Actualizacion registro de riesgos"],
            ["Design Review", "Segun hitos", "Todos", "Revision formal de entregables"],
            ["HAZOP Sessions", "2 sesiones", "Multidisciplinar", "Estudio de riesgos de proceso"],
            ["Cierre de Fase", "Al finalizar", "Todos", "Lecciones aprendidas y cierre"],
        ],
        col_widths=[45, 30, 50, 65],
    )

    pdf.sub_title("8.1 Herramientas de Comunicacion y Colaboracion")
    pdf.bullet_list([
        "Portal de proyecto web con acceso 24/7 para el cliente",
        "Sistema de gestion documental (Aconex o equivalente)",
        "Videoconferencia para reuniones remotas (MS Teams / Zoom)",
        "Informe de progreso semanal escrito (Weekly Progress Report)",
        "Informe mensual ejecutivo con KPIs del proyecto",
        "Dashboard de seguimiento de entregables en tiempo real",
    ])

    # Deliverables detailed list
    pdf.add_page()
    pdf.section_title("9", "Lista Detallada de Entregables")
    pdf.body_text(
        "A continuacion se presenta la lista completa de entregables del proyecto FEED, "
        "clasificados por disciplina y con indicacion del formato de entrega."
    )
    pdf.sub_title("9.1 Ingenieria de Proceso")
    pdf.add_table(
        ["Codigo", "Entregable", "Formato"],
        [
            ["PR-001", "Design Basis Memorandum", "Word/PDF"],
            ["PR-002", "Simulacion de Proceso (modelo HYSYS)", "Archivo .hsc"],
            ["PR-003", "Diagramas de Flujo de Proceso (PFDs)", "AutoCAD/PDF"],
            ["PR-004", "Balances de Masa y Energia", "Excel/PDF"],
            ["PR-005", "P&IDs (Diagramas de Tuberias e Instrumentacion)", "SmartPlant/PDF"],
            ["PR-006", "Hojas de Datos de Equipos de Proceso", "Excel/PDF"],
            ["PR-007", "Filosofia de Control de Proceso", "Word/PDF"],
            ["PR-008", "Informe de HAZOP", "Word/PDF"],
            ["PR-009", "Estudio SIL / LOPA", "Word/PDF"],
            ["PR-010", "Estudio de Alivio y Venteo (API 521)", "Word/PDF"],
            ["PR-011", "Estudios de Hidraulica de Lineas", "Excel/PDF"],
        ],
        col_widths=[25, 110, 55],
    )
    pdf.sub_title("9.2 Ingenieria Mecanica y Tuberias")
    pdf.add_table(
        ["Codigo", "Entregable", "Formato"],
        [
            ["ME-001", "Especificaciones de Materiales de Tuberias (Piping Classes)", "Word/PDF"],
            ["ME-002", "Planos de Routing de Tuberias (Key Plans)", "3D Model/PDF"],
            ["ME-003", "Analisis de Flexibilidad de Lineas Criticas", "Caesar II/PDF"],
            ["ME-004", "Especificaciones de Equipos Rotativos", "Word/PDF"],
            ["ME-005", "Especificaciones de Recipientes a Presion", "Word/PDF"],
            ["ME-006", "Modelo 3D de la Planta", "AVEVA E3D"],
            ["ME-007", "Estudio de Constructibilidad", "Word/PDF"],
        ],
        col_widths=[25, 110, 55],
    )

    pdf.add_page()
    pdf.sub_title("9.3 Instrumentacion y Control")
    pdf.add_table(
        ["Codigo", "Entregable", "Formato"],
        [
            ["IC-001", "Arquitectura del Sistema DCS", "Visio/PDF"],
            ["IC-002", "Arquitectura del Sistema SIS", "Visio/PDF"],
            ["IC-003", "Lista de Instrumentos", "Excel/PDF"],
            ["IC-004", "Hojas de Datos de Instrumentos", "SmartPlant/PDF"],
            ["IC-005", "Logica de Control (Cause & Effect)", "Excel/PDF"],
            ["IC-006", "Especificacion de Analizadores", "Word/PDF"],
        ],
        col_widths=[25, 110, 55],
    )
    pdf.sub_title("9.4 Ingenieria Electrica")
    pdf.add_table(
        ["Codigo", "Entregable", "Formato"],
        [
            ["EL-001", "Estudio de Cargas Electricas", "ETAP/PDF"],
            ["EL-002", "Diagramas Unifilares", "AutoCAD/PDF"],
            ["EL-003", "Clasificacion de Areas (ATEX)", "AutoCAD/PDF"],
            ["EL-004", "Estudio de Cortocircuito y Coordinacion de Protecciones", "ETAP/PDF"],
            ["EL-005", "Especificaciones de Equipos Electricos", "Word/PDF"],
        ],
        col_widths=[25, 110, 55],
    )
    pdf.sub_title("9.5 Ingenieria Civil y Estructural")
    pdf.add_table(
        ["Codigo", "Entregable", "Formato"],
        [
            ["CV-001", "Plot Plan General", "AutoCAD/PDF"],
            ["CV-002", "Diseno de Cimentaciones de Equipos Principales", "STAAD/PDF"],
            ["CV-003", "Diseno de Pipe Racks", "Tekla/PDF"],
            ["CV-004", "Diseno de Edificios (Sala de Control, Subestacion)", "AutoCAD/PDF"],
            ["CV-005", "Red de Drenajes", "AutoCAD/PDF"],
        ],
        col_widths=[25, 110, 55],
    )

    # HSE approach
    pdf.add_page()
    pdf.section_title("10", "Enfoque HSE en la Fase FEED")
    pdf.body_text(
        f"{s['nombre']} integrara los principios de seguridad inherente en todas las decisiones de diseno. "
        "Se realizaran revisiones de constructibilidad y mantenibilidad para asegurar que el diseno "
        "facilite una construccion y operacion seguras."
    )
    pdf.bullet_list([
        "Revision de seguridad inherente (Inherent Safety Review) en fase conceptual",
        "HAZOP formal con participacion del cliente (minimo 2 sesiones de 5 dias)",
        "Estudio SIL / LOPA conforme a IEC 61511",
        "Estudio de clasificacion de areas (ATEX/NEC)",
        "Estudio de fire and gas detection layout",
        "Analisis de dispersion de gases y radiacion termica",
        "Revision de escape routes y puntos de reunion",
        "Design review de HSE en cada hito principal",
    ])

    # Exceptions
    pdf.section_title("11", "Excepciones y Desviaciones")
    exceptions_by_supplier = {
        "Supplier_01": (
            f"{s['nombre']} acepta integramente los requisitos de la RFP Tecnica con las siguientes "
            "desviaciones menores:\n"
            "- Se propone sustituir PDMS por AVEVA E3D (version actualizada del mismo proveedor) para el modelo 3D.\n"
            "- Se solicita ampliar el plazo de la Fase 1 en 2 semanas para incluir un Digital Twin piloto.\n"
            "No se proponen otras desviaciones respecto al alcance requerido."
        ),
        "Supplier_02": (
            f"{s['nombre']} acepta los requisitos de la RFP Tecnica con las siguientes observaciones:\n"
            "- Se propone un unico estudio HAZOP de 10 dias continuos (en lugar de 2 sesiones separadas) "
            "para mayor eficiencia.\n"
            "- El estudio de constructibilidad se limitara al plot plan y pipe racks principales.\n"
            "No se proponen otras desviaciones significativas."
        ),
        "Supplier_03": (
            f"{s['nombre']} presenta las siguientes desviaciones respecto a la RFP Tecnica:\n"
            "- Se propone Pro/II en lugar de Aspen HYSYS para la simulacion de proceso (equivalente validado).\n"
            "- Los entregables se emitiran en ingles; las traducciones al espanol se facturaran por separado.\n"
            "- Se propone un modelo de trabajo follow-the-sun con oficinas en UK, Espana y Malasia.\n"
            "- El coordinador HSE tendra una dedicacion del 40% (frente al 50% requerido).\n"
            "- Se excluye el estudio SIL detallado, incluyendose solo la clasificacion SIL preliminar."
        ),
        "Supplier_04": (
            f"{s['nombre']} acepta integramente los requisitos de la RFP Tecnica sin desviaciones. "
            "Adicionalmente, ofrecemos sin coste los siguientes servicios adicionales:\n"
            "- Analisis de Ciclo de Vida (LCA) del proyecto\n"
            "- Estudio de integracion de energias renovables para autoconsumo\n"
            "- Certificacion de huella de carbono del FEED\n"
            "- Optimizacion energetica avanzada mediante pinch analysis extendido"
        ),
    }
    pdf.body_text(exceptions_by_supplier[supplier_key])

    path = os.path.join(BASE_DIR, supplier_key, "Oferta_Tecnica.pdf")
    pdf.output(path)
    return path


def generate_oferta_economica(supplier_key):
    s = SUPPLIERS[supplier_key]
    capex = s["capex"]
    opex = s["opex"]
    total_capex = sum(capex.values())
    total_opex = sum(opex.values())
    iva_capex = round(total_capex * 0.21)
    iva_opex = round(total_opex * 0.21)
    grand_capex = total_capex + iva_capex
    grand_opex = total_opex + iva_opex
    lcc = total_capex + 10 * total_opex

    pdf = BasePDF()
    pdf.company_name = s["nombre"]
    pdf.alias_nb_pages()
    pdf.add_cover(
        "Oferta Economica",
        PROJECT_NAME,
        [
            f"Presentada por: {s['nombre']}",
            f"CIF: {s['cif']}",
            f"Referencia: {PROJECT_REF}",
            "CONFIDENCIAL - OFERTA ECONOMICA",
        ],
    )

    pdf.add_page()
    pdf.section_title("1", "Resumen Ejecutivo de la Oferta Economica")
    pdf.body_text(
        f"{s['nombre']} presenta su oferta economica para la ejecucion de la fase FEED del proyecto "
        f"de referencia. El importe total CAPEX asciende a {fmt(total_capex)} (sin IVA), y la estimacion "
        f"de OPEX anual es de {fmt(total_opex)} (sin IVA)."
    )
    pdf.body_text(
        f"El coste de ciclo de vida estimado (CAPEX + 10 x OPEX anual) es de {fmt(lcc)}."
    )

    # CAPEX Summary
    pdf.add_page()
    pdf.section_title("2", "Desglose CAPEX")
    pdf.sub_title("Tabla A - Resumen CAPEX por Partida Principal")

    def pct(val, total):
        return f"{val/total*100:.1f}%"

    pdf.add_table(
        ["Partida", "Importe (EUR)", "% Total"],
        [
            ["A.1 Ingenieria", fmt(capex["ingenieria"]), pct(capex["ingenieria"], total_capex)],
            ["A.2 Procura", fmt(capex["procura"]), pct(capex["procura"], total_capex)],
            ["A.3 Construccion", fmt(capex["construccion"]), pct(capex["construccion"], total_capex)],
            ["A.4 Commissioning", fmt(capex["commissioning"]), pct(capex["commissioning"], total_capex)],
            ["SUBTOTAL CAPEX", fmt(total_capex), "100,0%"],
            ["IVA (21%)", fmt(iva_capex), "-"],
            ["TOTAL CAPEX (IVA incl.)", fmt(grand_capex), "-"],
        ],
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # CAPEX detail: Ingenieria
    pdf.sub_title("Detalle A.1 - Ingenieria")
    ing = capex["ingenieria"]
    rate = 100  # EUR/hora tarifa media
    ing_detail = [
        ["Ingenieria de Proceso", fmt(round(ing * 0.30)), f"{round(ing * 0.30 / rate):,} h"],
        ["Ingenieria Mecanica y Tuberias", fmt(round(ing * 0.25)), f"{round(ing * 0.25 / rate):,} h"],
        ["Ingenieria de Instrumentacion y Control", fmt(round(ing * 0.18)), f"{round(ing * 0.18 / rate):,} h"],
        ["Ingenieria Electrica", fmt(round(ing * 0.12)), f"{round(ing * 0.12 / rate):,} h"],
        ["Ingenieria Civil y Estructural", fmt(round(ing * 0.08)), f"{round(ing * 0.08 / rate):,} h"],
        ["Gestion de Proyecto (PMO)", fmt(round(ing * 0.07)), f"{round(ing * 0.07 / rate):,} h"],
        ["Total Ingenieria", fmt(ing), f"{round(ing / rate):,} h"],
    ]
    pdf.add_table(
        ["Concepto", "Importe (EUR)", "Horas Est."],
        ing_detail,
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # CAPEX detail: Procura
    pdf.add_page()
    pdf.sub_title("Detalle A.2 - Procura")
    proc = capex["procura"]
    proc_detail = [
        ["Equipos de proceso principales", fmt(round(proc * 0.45)), "Compresores, columnas, etc."],
        ["Material de tuberias", fmt(round(proc * 0.22)), "Tuberia, valvulas, accesorios"],
        ["Instrumentacion", fmt(round(proc * 0.15)), "Transmisores, valvulas control"],
        ["Material electrico", fmt(round(proc * 0.10)), "Cables, bandejas, aparamenta"],
        ["Transporte y logistica", fmt(round(proc * 0.08)), "Transporte a obra"],
        ["Total Procura", fmt(proc), "-"],
    ]
    pdf.add_table(
        ["Concepto", "Importe (EUR)", "Observaciones"],
        proc_detail,
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # CAPEX detail: Construccion
    pdf.sub_title("Detalle A.3 - Construccion")
    con = capex["construccion"]
    con_detail = [
        ["Obras civiles", fmt(round(con * 0.25)), "Cimentaciones, edificios"],
        ["Montaje mecanico", fmt(round(con * 0.35)), "Equipos, tuberias, estructuras"],
        ["Montaje electrico e instrumentacion", fmt(round(con * 0.20)), "Cableado, instrumentos"],
        ["Aislamiento y pintura", fmt(round(con * 0.10)), "Aislamiento termico/acustico"],
        ["Instalaciones temporales", fmt(round(con * 0.10)), "Oficinas obra, almacen"],
        ["Total Construccion", fmt(con), "-"],
    ]
    pdf.add_table(
        ["Concepto", "Importe (EUR)", "Observaciones"],
        con_detail,
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # CAPEX detail: Commissioning
    pdf.sub_title("Detalle A.4 - Commissioning")
    com = capex["commissioning"]
    com_detail = [
        ["Pre-commissioning", fmt(round(com * 0.30)), "Pruebas, limpiezas, soplado"],
        ["Commissioning mecanico", fmt(round(com * 0.25)), "Equipos rotativos, estaticos"],
        ["Commissioning control", fmt(round(com * 0.25)), "DCS, SIS, lazos de control"],
        ["Asistencia puesta en marcha", fmt(round(com * 0.20)), "3 meses post-MC"],
        ["Total Commissioning", fmt(com), "-"],
    ]
    pdf.add_table(
        ["Concepto", "Importe (EUR)", "Observaciones"],
        com_detail,
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # OPEX
    pdf.add_page()
    pdf.section_title("3", "Estimacion OPEX Anual")
    pdf.sub_title("Tabla B - Resumen OPEX Anual")
    pdf.add_table(
        ["Partida", "Importe Anual (EUR)", "% Total"],
        [
            ["B.1 Personal", fmt(opex["personal"]), pct(opex["personal"], total_opex)],
            ["B.2 Mantenimiento", fmt(opex["mantenimiento"]), pct(opex["mantenimiento"], total_opex)],
            ["B.3 Consumibles", fmt(opex["consumibles"]), pct(opex["consumibles"], total_opex)],
            ["B.4 Seguros", fmt(opex["seguros"]), pct(opex["seguros"], total_opex)],
            ["SUBTOTAL OPEX", fmt(total_opex), "100,0%"],
            ["IVA (21%)", fmt(iva_opex), "-"],
            ["TOTAL OPEX ANUAL (IVA incl.)", fmt(grand_opex), "-"],
        ],
        col_widths=[70, 65, 55],
        total_row=True,
    )

    # Rate card
    pdf.add_page()
    pdf.section_title("4", "Tarifa de Recursos Humanos (Rate Card)")
    pdf.body_text(
        "A continuacion se detallan las tarifas horarias aplicables a los recursos humanos del proyecto. "
        "Estas tarifas incluyen costes directos de personal, overhead, beneficio y gastos generales."
    )
    rate_cards = {
        "Supplier_01": [
            ["Director de Proyecto", "Senior (>15 anos)", "165", "100%"],
            ["Jefe de Disciplina", "Senior (>12 anos)", "140", "80-100%"],
            ["Ingeniero Senior", "10-15 anos", "120", "Variable"],
            ["Ingeniero de Proyecto", "5-10 anos", "95", "Variable"],
            ["Ingeniero Junior", "2-5 anos", "72", "Variable"],
            ["Delineante / CAD Operator", ">5 anos", "65", "Variable"],
            ["Tecnico de Calidad", ">8 anos", "85", "50%"],
            ["Planificador", ">8 anos", "90", "60%"],
            ["Admin. de Proyecto", ">3 anos", "55", "100%"],
        ],
        "Supplier_02": [
            ["Director de Proyecto", "Senior (>12 anos)", "145", "100%"],
            ["Jefe de Disciplina", "Senior (>10 anos)", "125", "80-100%"],
            ["Ingeniero Senior", "8-12 anos", "105", "Variable"],
            ["Ingeniero de Proyecto", "4-8 anos", "85", "Variable"],
            ["Ingeniero Junior", "1-4 anos", "62", "Variable"],
            ["Delineante / CAD Operator", ">3 anos", "55", "Variable"],
            ["Planificador", ">6 anos", "80", "60%"],
            ["Admin. de Proyecto", ">2 anos", "48", "100%"],
        ],
        "Supplier_03": [
            ["Project Director", "Senior (>15 anos)", "180", "80%"],
            ["Discipline Lead (Espana)", "Senior (>10 anos)", "115", "100%"],
            ["Discipline Lead (UK/Intl)", "Senior (>10 anos)", "155", "Variable"],
            ["Senior Engineer (Espana)", "8-12 anos", "90", "Variable"],
            ["Senior Engineer (Intl)", "8-12 anos", "130", "Variable"],
            ["Project Engineer", "4-8 anos", "70", "Variable"],
            ["Junior Engineer", "1-4 anos", "50", "Variable"],
            ["CAD Operator (offshore)", ">3 anos", "35", "Variable"],
            ["Planner", ">6 anos", "75", "60%"],
        ],
        "Supplier_04": [
            ["Directora de Proyecto", "Senior (>15 anos)", "170", "100%"],
            ["Jefe de Disciplina", "Senior (>12 anos)", "145", "80-100%"],
            ["Ingeniero Senior", "10-15 anos", "125", "Variable"],
            ["Ingeniero de Proyecto", "5-10 anos", "100", "Variable"],
            ["Ingeniero Junior", "2-5 anos", "75", "Variable"],
            ["Especialista Sostenibilidad", ">8 anos", "130", "50%"],
            ["Delineante / CAD Operator", ">5 anos", "68", "Variable"],
            ["Tecnico de Calidad", ">8 anos", "90", "50%"],
            ["Planificador", ">8 anos", "95", "60%"],
        ],
    }
    pdf.add_table(
        ["Perfil", "Experiencia", "EUR/h", "Dedicacion"],
        rate_cards[supplier_key],
        col_widths=[55, 45, 30, 60],
    )

    # Sensitivity analysis
    pdf.add_page()
    pdf.section_title("5", "Analisis de Sensibilidad")
    pdf.body_text(
        "Se presenta un analisis de sensibilidad del CAPEX ante variaciones en las principales "
        "variables de coste. Los escenarios contemplan variaciones de +/- 10% y +/- 20%."
    )
    base = total_capex
    pdf.add_table(
        ["Escenario", "Variacion", "CAPEX Estimado (EUR)", "Delta vs Base"],
        [
            ["Pesimista extremo", "+20%", fmt(round(base * 1.20)), f"+{fmt(round(base * 0.20))}"],
            ["Pesimista", "+10%", fmt(round(base * 1.10)), f"+{fmt(round(base * 0.10))}"],
            ["Base (oferta)", "0%", fmt(base), "-"],
            ["Optimista", "-10%", fmt(round(base * 0.90)), f"-{fmt(round(base * 0.10))}"],
            ["Optimista extremo", "-20%", fmt(round(base * 0.80)), f"-{fmt(round(base * 0.20))}"],
        ],
        col_widths=[45, 25, 65, 55],
    )
    pdf.body_text(
        "Las principales variables de sensibilidad identificadas son:\n"
        "- Precios de equipos de proceso principales (compresores, columnas): +/- 12%\n"
        "- Disponibilidad y coste de mano de obra cualificada: +/- 8%\n"
        "- Precios de materiales (acero, cobre, cables): +/- 15%\n"
        "- Tipo de cambio EUR/USD (para equipos importados): +/- 5%\n"
        "- Productividad en obra: +/- 10%"
    )

    # Grand summary
    pdf.add_page()
    pdf.section_title("6", "Resumen General de la Oferta")
    pdf.add_table(
        ["Concepto", "Importe (EUR)"],
        [
            ["Total CAPEX (sin IVA)", fmt(total_capex)],
            ["Total OPEX Anual (sin IVA)", fmt(total_opex)],
            ["Coste Ciclo de Vida (CAPEX + 10xOPEX)", fmt(lcc)],
            ["", ""],
            ["Total CAPEX (IVA incl.)", fmt(grand_capex)],
            ["Total OPEX Anual (IVA incl.)", fmt(grand_opex)],
        ],
        col_widths=[100, 90],
    )

    pdf.section_title("5", "Condiciones Comerciales")
    pdf.sub_title("5.1 Validez de la Oferta")
    validity_by_supplier = {
        "Supplier_01": "La presente oferta tiene una validez de 90 dias naturales desde la fecha de presentacion.",
        "Supplier_02": "La presente oferta tiene una validez de 120 dias naturales desde la fecha de presentacion, como muestra de nuestro compromiso con el proyecto.",
        "Supplier_03": "La presente oferta tiene una validez de 60 dias naturales desde la fecha de presentacion. Pasado este plazo, los precios podran ser revisados.",
        "Supplier_04": "La presente oferta tiene una validez de 90 dias naturales desde la fecha de presentacion.",
    }
    pdf.body_text(validity_by_supplier[supplier_key])

    pdf.sub_title("5.2 Condiciones de Pago")
    payment_by_supplier = {
        "Supplier_01": (
            f"{s['nombre']} acepta el esquema de pago propuesto por la Propiedad en la RFP Economica "
            "(Ref: 02_RFP_Economica). Se solicita la posibilidad de negociar el anticipo del 10% al 15% "
            "para facilitar la movilizacion inicial del proyecto. Adicionalmente, ofrecemos un descuento "
            "del 2% por pronto pago (dentro de los 15 dias siguientes a la fecha de factura)."
        ),
        "Supplier_02": (
            f"{s['nombre']} acepta integramente el esquema de pago propuesto por la Propiedad. "
            "No solicitamos modificacion alguna del anticipo ni de los hitos de pago. Confirmamos "
            "que nuestros precios son firmes y no revisables durante toda la ejecucion del proyecto."
        ),
        "Supplier_03": (
            f"{s['nombre']} propone una modificacion del esquema de pago: anticipo del 20% (frente al 10% "
            "propuesto) contra aval bancario, manteniendo el resto de hitos. Este anticipo es necesario para "
            "la movilizacion del equipo internacional y la apertura de oficinas de proyecto en Espana. "
            "Los precios son revisables anualmente conforme al IPC si el proyecto se extiende mas de 12 meses."
        ),
        "Supplier_04": (
            f"{s['nombre']} acepta el esquema de pago propuesto. Proponemos adicionalmente una garantia "
            "extendida de 24 meses (frente a los 12 meses estandar) sin coste adicional, como muestra "
            "de confianza en la calidad de nuestro trabajo. Incluimos soporte tecnico remoto gratuito "
            "durante los primeros 6 meses tras la entrega del FEED."
        ),
    }
    pdf.body_text(payment_by_supplier[supplier_key])

    pdf.sub_title("5.3 Calendario de Hitos de Pago")
    milestones_by_supplier = {
        "Supplier_01": [
            ["Anticipo (contra aval)", "15%", "Firma del contrato"],
            ["Hito 1: Aprobacion PFDs", "20%", "Mes 3"],
            ["Hito 2: IFC (Issued for Construction)", "30%", "Mes 9"],
            ["Certificaciones mensuales construccion", "20%", "Meses 9-11"],
            ["Mechanical Completion", "10%", "Mes 11"],
            ["Performance Test (retencion)", "5%", "Mes 12+"],
        ],
        "Supplier_02": [
            ["Anticipo (contra aval)", "10%", "Firma del contrato"],
            ["Hito 1: Aprobacion PFDs", "20%", "Mes 3"],
            ["Hito 2: IFC", "30%", "Mes 8"],
            ["Certificaciones mensuales construccion", "25%", "Meses 8-10"],
            ["Mechanical Completion", "10%", "Mes 10"],
            ["Performance Test (retencion)", "5%", "Mes 10+"],
        ],
        "Supplier_03": [
            ["Anticipo (contra aval)", "20%", "Firma del contrato"],
            ["Hito 1: Design Basis aprobado", "15%", "Mes 2"],
            ["Hito 2: Aprobacion PFDs", "15%", "Mes 4"],
            ["Hito 3: IFC", "25%", "Mes 7"],
            ["Certificaciones mensuales", "15%", "Meses 7-9"],
            ["Mechanical Completion + Test", "10%", "Mes 9+"],
        ],
        "Supplier_04": [
            ["Anticipo (contra aval)", "10%", "Firma del contrato"],
            ["Hito 1: Aprobacion PFDs + LCA inicial", "15%", "Mes 4"],
            ["Hito 2: HAZOP completado", "15%", "Mes 6"],
            ["Hito 3: IFC", "25%", "Mes 10"],
            ["Certificaciones mensuales construccion", "20%", "Meses 10-12"],
            ["Mechanical Completion", "10%", "Mes 12"],
            ["Performance Test (retencion)", "5%", "Mes 13+"],
        ],
    }
    pdf.add_table(
        ["Hito", "% Pago", "Momento"],
        milestones_by_supplier[supplier_key],
        col_widths=[80, 30, 80],
    )

    pdf.add_page()
    pdf.sub_title("5.4 Descuentos y Bonificaciones")
    discounts_by_supplier = {
        "Supplier_01": (
            "Ofrecemos los siguientes descuentos:\n"
            "- Descuento por pronto pago: 2% si el pago se realiza en los 15 dias siguientes a la factura.\n"
            "- Descuento por adjudicacion de fase EPC: Si se adjudica la fase EPC a nuestra empresa, "
            "aplicaremos un descuento retroactivo del 5% sobre el importe FEED.\n"
            "- Descuento por volumen: No aplica para este alcance."
        ),
        "Supplier_02": (
            "Nuestra oferta ya incorpora precios muy competitivos con margenes ajustados, por lo que "
            "no ofrecemos descuentos adicionales. Sin embargo, garantizamos precio firme sin revision "
            "durante toda la ejecucion del proyecto, independientemente de variaciones de mercado."
        ),
        "Supplier_03": (
            "Ofrecemos los siguientes descuentos:\n"
            "- Descuento por adjudicacion antes del 31 de marzo 2025: 3% sobre el importe total.\n"
            "- Descuento por adjudicacion conjunta FEED + EPC: 8% sobre el importe FEED.\n"
            "- Los precios son revisables anualmente conforme al indice IPC de Espana si el proyecto "
            "se extiende mas alla de los 12 meses."
        ),
        "Supplier_04": (
            "Incluimos sin coste adicional los siguientes servicios de valor anadido:\n"
            "- Analisis de Ciclo de Vida (LCA) completo del proyecto (valorado en 85.000 EUR)\n"
            "- Certificacion de huella de carbono del FEED (valorado en 25.000 EUR)\n"
            "- Garantia extendida de 24 meses (vs. 12 meses estandar)\n"
            "- Soporte tecnico remoto 6 meses post-entrega\n"
            "Estos servicios representan un valor anadido de aproximadamente 150.000 EUR."
        ),
    }
    pdf.body_text(discounts_by_supplier[supplier_key])

    pdf.sub_title("5.5 Exclusiones")
    exclusions_by_supplier = {
        "Supplier_01": [
            "Licencias de tecnologia de proceso (si aplica)",
            "Coste del terreno y derechos de paso",
            "Permisos y licencias gubernamentales",
            "Costes de conexion a redes de utilities externas",
            "IVA (presentado por separado)",
        ],
        "Supplier_02": [
            "Licencias de tecnologia de proceso",
            "Coste del terreno y derechos de paso",
            "Permisos y licencias gubernamentales",
            "Costes de conexion a redes de utilities externas",
            "IVA (presentado por separado)",
            "Estudios geotecnicos adicionales (si se requieren mas de 2 campanas)",
        ],
        "Supplier_03": [
            "Licencias de tecnologia de proceso",
            "Coste del terreno y derechos de paso",
            "Permisos y licencias gubernamentales",
            "Costes de conexion a redes de utilities externas",
            "IVA (presentado por separado)",
            "Desplazamientos y dietas del equipo internacional (se facturaran a coste)",
            "Traducciones oficiales de documentacion (entregables en ingles)",
            "Sesiones de HAZOP adicionales a las 2 incluidas",
        ],
        "Supplier_04": [
            "Licencias de tecnologia de proceso (si aplica)",
            "Coste del terreno y derechos de paso",
            "Permisos y licencias gubernamentales",
            "Costes de conexion a redes de utilities externas",
            "IVA (presentado por separado)",
        ],
    }
    pdf.bullet_list(exclusions_by_supplier[supplier_key])

    pdf.sub_title("5.6 Garantias Financieras")
    guarantees_by_supplier = {
        "Supplier_01": (
            f"{s['nombre']} aportara las siguientes garantias financieras:\n"
            "- Aval bancario de buen fin de obra: 10% del valor del contrato (Banco Santander)\n"
            "- Seguro de responsabilidad civil profesional: 10.000.000 EUR (Mapfre)\n"
            "- Seguro de responsabilidad civil general: 5.000.000 EUR\n"
            "- Garantia de calidad de ingenieria: 18 meses desde entrega del FEED"
        ),
        "Supplier_02": (
            f"{s['nombre']} aportara las siguientes garantias:\n"
            "- Aval bancario de buen fin de obra: 10% del valor del contrato (CaixaBank)\n"
            "- Seguro de responsabilidad civil profesional: 8.000.000 EUR (Zurich)\n"
            "- Garantia de calidad de ingenieria: 18 meses desde entrega del FEED"
        ),
        "Supplier_03": (
            f"{s['nombre']} aportara las siguientes garantias:\n"
            "- Aval bancario de buen fin de obra: 5% del valor del contrato (HSBC)\n"
            "- Seguro de responsabilidad civil profesional: 5.000.000 EUR (Lloyd's)\n"
            "- Garantia de calidad de ingenieria: 12 meses desde entrega del FEED"
        ),
        "Supplier_04": (
            f"{s['nombre']} aportara las siguientes garantias:\n"
            "- Aval bancario de buen fin de obra: 10% del valor del contrato (BBVA)\n"
            "- Seguro de responsabilidad civil profesional: 15.000.000 EUR (Allianz)\n"
            "- Seguro de responsabilidad civil general: 8.000.000 EUR\n"
            "- Garantia de calidad de ingenieria: 24 meses desde entrega del FEED\n"
            "- Garantia de rendimiento: compromiso de performance del diseno"
        ),
    }
    pdf.body_text(guarantees_by_supplier[supplier_key])

    path = os.path.join(BASE_DIR, supplier_key, "Oferta_Economica.pdf")
    pdf.output(path)
    return path


def generate_oferta_compliance(supplier_key):
    s = SUPPLIERS[supplier_key]
    pdf = BasePDF()
    pdf.company_name = s["nombre"]
    pdf.alias_nb_pages()
    pdf.add_cover(
        "Oferta de Compliance, HSE y Medioambiente",
        PROJECT_NAME,
        [
            f"Presentada por: {s['nombre']}",
            f"CIF: {s['cif']}",
            f"Referencia: {PROJECT_REF}",
        ],
    )

    pdf.add_page()
    pdf.section_title("1", "Compromiso HSE de la Direccion")
    commitment = {
        "Supplier_01": (
            f"La Direccion de {s['nombre']} ratifica su compromiso con la politica de cero accidentes. "
            "La seguridad es un valor fundamental e innegociable en nuestra organizacion. Todos nuestros "
            "proyectos se ejecutan bajo el lema 'Nadie se lesiona en nuestros proyectos'. Nuestro TRIR "
            "en los ultimos 3 anos ha sido de 0.32, significativamente por debajo de la media del sector."
        ),
        "Supplier_02": (
            f"En {s['nombre']}, la seguridad y el bienestar de nuestros empleados y colaboradores es nuestra "
            "maxima prioridad. Mantenemos un compromiso firme con la mejora continua en HSE y la prevencion "
            "de accidentes. Nuestro TRIR medio en los ultimos 3 anos es de 0.41."
        ),
        "Supplier_03": (
            f"{s['nombre']} se compromete a cumplir con todos los requisitos legales y contractuales en materia "
            "de seguridad y salud. Nuestro objetivo es mantener un entorno de trabajo seguro para todos los "
            "participantes en el proyecto. Nuestro TRIR global en los ultimos 3 anos es de 0.68."
        ),
        "Supplier_04": (
            f"{s['nombre']} situa la seguridad, la salud y la sostenibilidad en el centro de su estrategia "
            "empresarial. Somos referentes del sector en HSE con un TRIR de 0.18 en los ultimos 3 anos, "
            "el mas bajo de la industria EPC en Espana. Nuestro objetivo declarado es Vision Zero: "
            "cero accidentes, cero enfermedades profesionales, cero danos al medioambiente."
        ),
    }
    pdf.body_text(commitment[supplier_key])

    pdf.section_title("2", "Indicadores de Seguridad")
    indicators = {
        "Supplier_01": [
            ["TRIR", "0.35", "0.30", "0.32"],
            ["LTIR", "0.10", "0.08", "0.12"],
            ["DART Rate", "0.20", "0.18", "0.15"],
            ["Fatalidades", "0", "0", "0"],
            ["Horas formacion HSE/empl/ano", "48", "52", "55"],
        ],
        "Supplier_02": [
            ["TRIR", "0.45", "0.40", "0.38"],
            ["LTIR", "0.14", "0.12", "0.10"],
            ["DART Rate", "0.28", "0.25", "0.22"],
            ["Fatalidades", "0", "0", "0"],
            ["Horas formacion HSE/empl/ano", "42", "44", "46"],
        ],
        "Supplier_03": [
            ["TRIR", "0.75", "0.65", "0.62"],
            ["LTIR", "0.22", "0.18", "0.20"],
            ["DART Rate", "0.40", "0.35", "0.38"],
            ["Fatalidades", "0", "0", "0"],
            ["Horas formacion HSE/empl/ano", "32", "35", "38"],
        ],
        "Supplier_04": [
            ["TRIR", "0.22", "0.18", "0.15"],
            ["LTIR", "0.05", "0.04", "0.03"],
            ["DART Rate", "0.12", "0.10", "0.08"],
            ["Fatalidades", "0", "0", "0"],
            ["Horas formacion HSE/empl/ano", "60", "65", "70"],
        ],
    }
    pdf.add_table(
        ["Indicador", "2022", "2023", "2024"],
        indicators[supplier_key],
        col_widths=[70, 40, 40, 40],
    )

    pdf.add_page()
    pdf.section_title("3", "Certificaciones HSE y Medioambiente")
    pdf.bullet_list(s["cert"])
    extra_certs = {
        "Supplier_01": ["Registro EMAS (Eco-Management and Audit Scheme)", "Certificado EcoVadis Gold"],
        "Supplier_02": ["Certificado EcoVadis Silver"],
        "Supplier_03": [],
        "Supplier_04": [
            "ISO 50001:2018 (Gestion Energetica)",
            "Registro EMAS",
            "Certificado EcoVadis Platinum",
            "Science Based Targets initiative (SBTi) comprometido",
            "B Corp Certification (en proceso)",
        ],
    }
    if extra_certs[supplier_key]:
        pdf.sub_title("Certificaciones Adicionales")
        pdf.bullet_list(extra_certs[supplier_key])

    pdf.section_title("4", "Plan HSE del Proyecto")
    pdf.body_text(
        f"{s['nombre']} desarrollara un Plan HSE especifico para este proyecto que incluira:"
    )
    hse_items = [
        "Analisis de riesgos del proyecto (matriz de riesgos HSE)",
        "Procedimientos de trabajo seguro para actividades criticas",
        "Plan de emergencias y evacuacion",
        "Programa de inspecciones y auditorias",
        "Gestion de permisos de trabajo (PTW)",
        "Programa de observaciones preventivas de seguridad (BBS)",
        "Plan de formacion HSE especifico del proyecto",
    ]
    pdf.bullet_list(hse_items)

    pdf.add_page()
    pdf.section_title("5", "Gestion Medioambiental")
    env_approach = {
        "Supplier_01": (
            "Implementaremos un Plan de Gestion Ambiental alineado con ISO 14001:2015 que incluye "
            "gestion integral de residuos, control de emisiones, prevencion de vertidos y un programa "
            "de restauracion ambiental. Nos comprometemos a un objetivo de reciclaje del 85% de los "
            "residuos de construccion."
        ),
        "Supplier_02": (
            "Nuestro Plan de Gestion Ambiental cubre todos los aspectos requeridos en la RFP de Compliance. "
            "Nos comprometemos a la segregacion de residuos, control de emisiones y prevencion de vertidos. "
            "Objetivo de reciclaje: 75% de residuos de construccion."
        ),
        "Supplier_03": (
            "Cumpliremos con todos los requisitos medioambientales legales y contractuales. Implementaremos "
            "un plan basico de gestion de residuos y control de emisiones conforme a la normativa vigente. "
            "Objetivo de reciclaje: 60% de residuos de construccion."
        ),
        "Supplier_04": (
            "Somos pioneros en sostenibilidad en el sector EPC. Nuestro Plan Ambiental incluye analisis de "
            "ciclo de vida, huella de carbono del proyecto, plan de economia circular con objetivo del 95% "
            "de reciclaje de residuos, compensacion de emisiones de CO2 no evitables, y un plan de "
            "biodiversidad para el entorno del emplazamiento. Proponemos la instalacion de paneles solares "
            "para las oficinas de obra como medida de autoconsumo."
        ),
    }
    pdf.body_text(env_approach[supplier_key])

    pdf.section_title("6", "Programa de Formacion HSE")
    pdf.body_text(
        f"{s['nombre']} implementara un programa de formacion HSE especifico para el proyecto, "
        "que incluira los siguientes modulos obligatorios para todo el personal:"
    )
    training_by_supplier = {
        "Supplier_01": [
            ["Induccion HSE del proyecto", "Todos", "8h", "Antes de incorporacion"],
            ["Trabajos en altura", "Personal de obra", "4h", "Antes de trabajos"],
            ["Espacios confinados", "Personal de obra", "4h", "Antes de trabajos"],
            ["Manejo de sustancias quimicas", "Operadores + lab", "4h", "Trimestral"],
            ["Primeros auxilios", "Seleccionados (10%)", "16h", "Anual"],
            ["Extincion de incendios", "Todo personal de obra", "4h", "Semestral"],
            ["Seguridad electrica", "Electricistas + I&C", "8h", "Antes de trabajos"],
            ["Gestion de emergencias", "Mandos intermedios", "8h", "Trimestral"],
            ["Liderazgo en seguridad", "Supervisores + PMs", "16h", "Unica"],
        ],
        "Supplier_02": [
            ["Induccion HSE del proyecto", "Todos", "6h", "Antes de incorporacion"],
            ["Trabajos en altura", "Personal de obra", "4h", "Antes de trabajos"],
            ["Espacios confinados", "Personal de obra", "4h", "Antes de trabajos"],
            ["Manejo de cargas", "Riggers + operadores", "4h", "Antes de trabajos"],
            ["Primeros auxilios", "Seleccionados (8%)", "16h", "Anual"],
            ["Extincion de incendios", "Todo personal de obra", "2h", "Semestral"],
            ["Seguridad electrica", "Electricistas", "6h", "Antes de trabajos"],
        ],
        "Supplier_03": [
            ["HSE Induction", "All personnel", "4h", "Before mobilisation"],
            ["Working at heights", "Site crew", "4h", "Before works"],
            ["Confined space entry", "Site crew", "4h", "Before works"],
            ["Fire fighting basics", "All site personnel", "2h", "Annual"],
            ["First aid", "Selected (5%)", "8h", "Annual"],
        ],
        "Supplier_04": [
            ["Induccion HSE + Sostenibilidad", "Todos", "12h", "Antes de incorporacion"],
            ["Trabajos en altura avanzado", "Personal de obra", "8h", "Antes de trabajos"],
            ["Espacios confinados avanzado", "Personal de obra", "8h", "Antes de trabajos"],
            ["Manejo de sustancias quimicas", "Operadores + lab", "4h", "Trimestral"],
            ["Primeros auxilios avanzado", "Seleccionados (15%)", "24h", "Anual"],
            ["Extincion de incendios", "Todo personal de obra", "4h", "Semestral"],
            ["Seguridad electrica", "Electricistas + I&C", "8h", "Antes de trabajos"],
            ["Gestion de emergencias", "Mandos intermedios", "12h", "Trimestral"],
            ["Liderazgo en seguridad", "Supervisores + PMs", "24h", "Unica"],
            ["Sensibilizacion medioambiental", "Todos", "4h", "Semestral"],
            ["Gestion de residuos en obra", "Encargados + capataces", "4h", "Trimestral"],
        ],
    }
    pdf.add_table(
        ["Modulo", "Destinatarios", "Duracion", "Periodicidad"],
        training_by_supplier[supplier_key],
        col_widths=[55, 45, 25, 65],
    )

    pdf.add_page()
    pdf.section_title("7", "Procedimientos de Emergencia")
    pdf.body_text(
        f"{s['nombre']} desarrollara un Plan de Emergencias especifico para el proyecto que cubrira "
        "los siguientes escenarios:"
    )
    pdf.bullet_list([
        "Incendio en zona de proceso o almacenamiento",
        "Fuga de gas toxico (H2S) o inflamable",
        "Derrame de productos quimicos o hidrocarburos",
        "Accidente laboral grave o multiple",
        "Fenomenos meteorologicos adversos (tormentas, inundaciones)",
        "Evacuacion general del emplazamiento",
        "Amenaza de seguridad externa (intrusismo, sabotaje)",
        "Fallo de suministro electrico o utilities criticas",
    ])
    pdf.body_text(
        "Se realizaran simulacros de emergencia con la siguiente frecuencia:\n"
        "- Evacuacion general: trimestral\n"
        "- Respuesta a derrame: semestral\n"
        "- Respuesta a fuga de gas: semestral\n"
        "- Comunicacion de emergencia: mensual (ejercicio de mesa)"
    )

    pdf.section_title("8", "Programa de Compliance")
    pdf.body_text(
        f"{s['nombre']} dispone de un programa de compliance que incluye:"
    )
    compliance_items_base = [
        "Codigo etico y de conducta corporativo",
        "Politica anti-corrupcion y anti-soborno",
        "Canal de denuncias confidencial",
        "Formacion anual en compliance para todo el personal",
    ]
    compliance_extra = {
        "Supplier_01": ["Due diligence de terceros y proveedores", "Comite de compliance independiente"],
        "Supplier_02": ["Evaluacion periodica de riesgos de compliance"],
        "Supplier_03": [],
        "Supplier_04": [
            "Due diligence reforzada de toda la cadena de suministro",
            "Comite de etica y compliance con consejero independiente",
            "Informe anual de sostenibilidad verificado por tercero",
            "Politica de derechos humanos alineada con UN Guiding Principles",
        ],
    }
    pdf.bullet_list(compliance_items_base + compliance_extra[supplier_key])

    path = os.path.join(BASE_DIR, supplier_key, "Oferta_Compliance.pdf")
    pdf.output(path)
    return path


def generate_anexos(supplier_key):
    s = SUPPLIERS[supplier_key]
    pdf = BasePDF()
    pdf.company_name = s["nombre"]
    pdf.alias_nb_pages()
    pdf.add_cover(
        "Anexos a la Oferta",
        PROJECT_NAME,
        [
            f"Presentada por: {s['nombre']}",
            f"CIF: {s['cif']}",
            f"Referencia: {PROJECT_REF}",
        ],
    )

    # Anexo 1: Certificaciones
    pdf.add_page()
    pdf.section_title("A", "Anexo I - Certificaciones y Acreditaciones")
    pdf.body_text(f"A continuacion se presentan las certificaciones vigentes de {s['nombre']}:")
    for cert in s["cert"]:
        pdf.sub_title(cert)
        pdf.body_text(
            f"Organismo certificador: Bureau Veritas / SGS / TUV Rheinland\n"
            f"Fecha de emision: Enero 2023\n"
            f"Fecha de validez: Enero 2026\n"
            f"Alcance: Ingenieria, procura y gestion de construccion de plantas industriales."
        )

    # Anexo 2: CVs
    pdf.add_page()
    pdf.section_title("B", "Anexo II - Curricula Vitae del Equipo Clave")
    cv_data = {
        "Supplier_01": [
            ("Carlos Martinez - Director de Proyecto",
             "PhD en Ingenieria Quimica por la UPM. PMP certificado. 22 anos de experiencia en proyectos "
             "FEED y EPC en oil & gas. Ha dirigido 8 proyectos FEED de plantas de gas con capacidades "
             "superiores a 200 MMSCFD. Idiomas: espanol (nativo), ingles (C2), frances (B2)."),
            ("Ana Rodriguez - Jefa de Ingenieria de Proceso",
             "MSc en Ingenieria Quimica por la UB. 18 anos de experiencia en simulacion y diseno de "
             "procesos de gas natural. Experta en Aspen HYSYS y Aspen Plus. Ha liderado la ingenieria "
             "de proceso de 6 plantas de gas. Idiomas: espanol (nativo), ingles (C1)."),
        ],
        "Supplier_02": [
            ("Javier Ruiz - Director de Proyecto",
             "Ingeniero Industrial por la UPC. PMP certificado. 18 anos de experiencia en gestion de "
             "proyectos industriales. Ha dirigido 5 proyectos FEED en petroquimica y gas. Reconocido "
             "por su capacidad de liderazgo y gestion de stakeholders. Idiomas: espanol (nativo), ingles (C1)."),
            ("Carmen Vidal - Jefa de Ingenieria de Proceso",
             "MSc en Ingenieria Quimica por la UV. 14 anos de experiencia en diseno de procesos "
             "petroquimicos y de gas. Dominio de Aspen HYSYS. Idiomas: espanol (nativo), ingles (B2)."),
        ],
        "Supplier_03": [
            ("James Wilson - Project Director",
             "MEng Chemical Engineering, Imperial College London. PMP certified. 20 years experience "
             "in major EPC projects worldwide. Has directed projects in Middle East, Africa and Europe. "
             "Languages: English (native), Spanish (B1), Arabic (A2)."),
            ("Antonio Garcia - Lead Process Engineer",
             "Ingeniero Quimico por la UPV. 15 anos en diseno de plantas de procesamiento de gas. "
             "Experiencia en Arabia Saudi y Norte de Africa. Idiomas: espanol (nativo), ingles (C1), arabe (A2)."),
        ],
        "Supplier_04": [
            ("Elena Navarro - Directora de Proyecto",
             "PhD en Ingenieria Industrial por la UPV. PMP certificada. 20 anos de experiencia, "
             "los ultimos 8 enfocados en proyectos con componente de sostenibilidad. Reconocida "
             "ponente en conferencias internacionales de ingenieria sostenible. Idiomas: espanol (nativo), "
             "ingles (C2), italiano (B2)."),
            ("Pablo Jimenez - Jefe de Ingenieria de Proceso",
             "MSc en Ingenieria Quimica por la UCM. 16 anos de experiencia en diseno de procesos de gas "
             "con enfasis en eficiencia energetica. Experto en Aspen HYSYS y analisis pinch. Autor de "
             "3 publicaciones tecnicas. Idiomas: espanol (nativo), ingles (C1)."),
        ],
    }
    for name_role, cv_text in cv_data[supplier_key]:
        pdf.sub_title(name_role)
        pdf.body_text(cv_text)

    # Anexo 3: Organigrama
    pdf.add_page()
    pdf.section_title("C", "Anexo III - Organigrama del Proyecto")
    pdf.body_text(
        f"A continuacion se presenta el organigrama propuesto por {s['nombre']} para la ejecucion del proyecto. "
        "El equipo estara liderado por el Director de Proyecto con reporte directo al Sponsor del proyecto "
        "en el cliente. Cada lider de disciplina tendra un equipo dedicado de ingenieros especialistas."
    )
    org_structure = [
        "Director de Proyecto",
        "  +-- Jefe de Ingenieria de Proceso",
        "  |     +-- 4-6 Ingenieros de Proceso",
        "  +-- Jefe de Ingenieria Mecanica",
        "  |     +-- 3-5 Ingenieros Mecanicos / Tuberias",
        "  +-- Jefe de Instrumentacion y Control",
        "  |     +-- 3-4 Ingenieros de I&C",
        "  +-- Jefe de Ingenieria Electrica",
        "  |     +-- 2-3 Ingenieros Electricos",
        "  +-- Jefe de Ingenieria Civil",
        "  |     +-- 2-3 Ingenieros Civiles",
        "  +-- Coordinador HSE",
        "  +-- Responsable de Calidad (QA/QC)",
        "  +-- Planificador / Controller",
    ]
    pdf.set_font("Courier", "", 9)
    for line in org_structure:
        pdf.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Anexo 4: Insurance
    pdf.add_page()
    pdf.section_title("D", "Anexo IV - Polizas de Seguro")
    pdf.body_text(f"{s['nombre']} dispone de las siguientes polizas de seguro vigentes:")
    insurance_by_supplier = {
        "Supplier_01": [
            ["Responsabilidad Civil General", "10.000.000 EUR", "Mapfre", "Dic 2026"],
            ["Resp. Civil Profesional (E&O)", "10.000.000 EUR", "Mapfre", "Dic 2026"],
            ["Todo Riesgo Construccion (CAR)", "Segun proyecto", "Zurich", "Por proyecto"],
            ["Accidentes de Trabajo", "Segun convenio", "Mutua Intercomarcal", "Anual"],
            ["Transporte de Mercancias", "2.000.000 EUR", "Allianz", "Dic 2026"],
            ["Responsabilidad Medioambiental", "5.000.000 EUR", "AXA", "Dic 2026"],
        ],
        "Supplier_02": [
            ["Responsabilidad Civil General", "8.000.000 EUR", "Zurich", "Jun 2026"],
            ["Resp. Civil Profesional (E&O)", "8.000.000 EUR", "Zurich", "Jun 2026"],
            ["Todo Riesgo Construccion (CAR)", "Segun proyecto", "Mapfre", "Por proyecto"],
            ["Accidentes de Trabajo", "Segun convenio", "Mutua Universal", "Anual"],
            ["Transporte de Mercancias", "1.500.000 EUR", "Mapfre", "Jun 2026"],
        ],
        "Supplier_03": [
            ["Public Liability", "5.000.000 EUR", "Lloyd's", "Mar 2026"],
            ["Professional Indemnity (E&O)", "5.000.000 EUR", "Lloyd's", "Mar 2026"],
            ["Construction All Risks (CAR)", "Per project", "Lloyd's", "Per project"],
            ["Workers Compensation", "Statutory", "HSBC Insurance", "Annual"],
        ],
        "Supplier_04": [
            ["Responsabilidad Civil General", "15.000.000 EUR", "Allianz", "Dic 2026"],
            ["Resp. Civil Profesional (E&O)", "15.000.000 EUR", "Allianz", "Dic 2026"],
            ["Todo Riesgo Construccion (CAR)", "Segun proyecto", "AXA", "Por proyecto"],
            ["Accidentes de Trabajo", "Segun convenio", "Mutua Balear", "Anual"],
            ["Transporte de Mercancias", "3.000.000 EUR", "Allianz", "Dic 2026"],
            ["Responsabilidad Medioambiental", "10.000.000 EUR", "AXA", "Dic 2026"],
            ["Cyber Risk Insurance", "2.000.000 EUR", "Hiscox", "Dic 2026"],
        ],
    }
    pdf.add_table(
        ["Poliza", "Cobertura", "Aseguradora", "Validez"],
        insurance_by_supplier[supplier_key],
        col_widths=[55, 45, 45, 45],
    )

    # Anexo 5: Declaracion
    pdf.add_page()
    pdf.section_title("E", "Anexo V - Declaracion Responsable")
    pdf.body_text(
        f"El abajo firmante, en representacion de {s['nombre']} (CIF: {s['cif']}), declara bajo su "
        "responsabilidad que:"
    )
    pdf.bullet_list([
        "La empresa se encuentra al corriente de sus obligaciones tributarias y con la Seguridad Social.",
        "No se encuentra incursa en ninguna de las prohibiciones para contratar previstas en la legislacion vigente.",
        "La informacion contenida en la presente oferta es veraz y completa.",
        "Acepta las condiciones de la RFP y las bases de licitacion.",
        "Mantiene la validez de la oferta durante un periodo de 90 dias naturales.",
        "Se compromete a mantener la confidencialidad de toda la documentacion del proyecto.",
    ])
    pdf.ln(15)
    pdf.body_text("Firma y sello de la empresa:")
    pdf.ln(20)
    pdf.body_text("_________________________________")
    pdf.body_text(f"En representacion de {s['nombre']}")
    pdf.body_text(f"Fecha: Febrero 2025")

    path = os.path.join(BASE_DIR, supplier_key, "Anexos.pdf")
    pdf.output(path)
    return path


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    # Create directories
    os.makedirs(os.path.join(BASE_DIR, "RFP"), exist_ok=True)
    for sk in SUPPLIERS:
        os.makedirs(os.path.join(BASE_DIR, sk), exist_ok=True)

    generated = []
    print("=" * 60)
    print("GENERADOR DE PDFs DEMO - BidEval v2")
    print("=" * 60)
    print()

    # RFPs
    print("[1/19] Generando RFP Tecnica...")
    generated.append(generate_rfp_tecnica())
    print("[2/19] Generando RFP Economica...")
    generated.append(generate_rfp_economica())
    print("[3/19] Generando RFP Compliance...")
    generated.append(generate_rfp_compliance())

    # Suppliers
    idx = 4
    for sk in SUPPLIERS:
        name = SUPPLIERS[sk]["nombre"]
        print(f"[{idx}/19] Generando Oferta Tecnica - {name}...")
        generated.append(generate_oferta_tecnica(sk))
        idx += 1
        print(f"[{idx}/19] Generando Oferta Economica - {name}...")
        generated.append(generate_oferta_economica(sk))
        idx += 1
        print(f"[{idx}/19] Generando Oferta Compliance - {name}...")
        generated.append(generate_oferta_compliance(sk))
        idx += 1
        print(f"[{idx}/19] Generando Anexos - {name}...")
        generated.append(generate_anexos(sk))
        idx += 1

    # Summary
    print()
    print("=" * 60)
    print("RESUMEN DE GENERACION")
    print("=" * 60)
    total_size = 0
    for path in generated:
        size = os.path.getsize(path)
        total_size += size
        rel = os.path.relpath(path, BASE_DIR)
        print(f"  OK  {rel:50s} {size/1024:6.1f} KB")

    print(f"\nTotal: {len(generated)} PDFs generados ({total_size/1024:.1f} KB)")
    print("=" * 60)


if __name__ == "__main__":
    main()
