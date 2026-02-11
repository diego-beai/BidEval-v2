# Informe de Analisis Economico - BidEval v2

**Fecha:** 2026-02-10 (actualizado)
**Objetivo:** Analizar la estructura economica de los PDFs demo, correspondencia con el modelo de datos del frontend, y gaps para la demo.

---

## 1. Datos Economicos de los PDFs Demo

### 1.1 Proveedores y CAPEX

| Proveedor | Ingenieria | Procura | Construccion | Commissioning | **Total CAPEX** |
|-----------|-----------|---------|-------------|---------------|----------------|
| TechnoEngineering Solutions S.L. | 3.200.000 | 4.100.000 | 5.800.000 | 1.400.000 | **14.500.000 EUR** |
| Iberia Industrial Projects S.A. | 2.800.000 | 3.750.000 | 5.200.000 | 1.250.000 | **13.000.000 EUR** |
| Global Process Engineering Ltd | 2.400.000 | 3.300.000 | 4.600.000 | 1.050.000 | **11.350.000 EUR** |
| MediterraneanEPC Group S.L. | 3.500.000 | 4.400.000 | 6.200.000 | 1.600.000 | **15.700.000 EUR** |

### 1.2 OPEX Anual

| Proveedor | Personal | Mantenimiento | Consumibles | Seguros | **Total OPEX** |
|-----------|----------|--------------|------------|---------|---------------|
| TechnoEng. | 620.000 | 280.000 | 95.000 | 145.000 | **1.140.000 EUR** |
| Iberia Ind. | 540.000 | 260.000 | 88.000 | 130.000 | **1.018.000 EUR** |
| Global Proc. | 480.000 | 220.000 | 75.000 | 110.000 | **885.000 EUR** |
| Mediterranean | 680.000 | 310.000 | 105.000 | 160.000 | **1.255.000 EUR** |

### 1.3 Coste de Ciclo de Vida (LCC = CAPEX + 10 x OPEX anual)

| Proveedor | CAPEX | OPEX x10 | **LCC** | Ranking |
|-----------|-------|---------|---------|---------|
| Global Process Eng. | 11.350.000 | 8.850.000 | **20.200.000** | #1 (mas barato) |
| Iberia Industrial | 13.000.000 | 10.180.000 | **23.180.000** | #2 |
| TechnoEngineering | 14.500.000 | 11.400.000 | **25.900.000** | #3 |
| MediterraneanEPC | 15.700.000 | 12.550.000 | **28.250.000** | #4 (mas caro) |

### 1.4 Condiciones Comerciales Diferenciadas

| Aspecto | TechnoEng. | Iberia Ind. | Global Proc. | Mediterranean |
|---------|-----------|-------------|-------------|---------------|
| **Anticipo** | 15% | 10% | 20% | 10% |
| **Validez oferta** | 90 dias | 120 dias | 60 dias | 90 dias |
| **Precio firme** | Si | Si | Revisable (IPC) | Si |
| **Dto. pronto pago** | 2% (15 dias) | No | No | No |
| **Dto. adjudicacion EPC** | 5% retroactivo | No | 8% si FEED+EPC | No |
| **Garantia ingenieria** | 18 meses | 18 meses | 12 meses | 24 meses |
| **Aval buen fin** | 10% (Santander) | 10% (CaixaBank) | 5% (HSBC) | 10% (BBVA) |
| **RC Profesional** | 10M EUR | 8M EUR | 5M EUR | 15M EUR |
| **Valor anadido** | Dto. pronto pago | Precio fijo | Precio agresivo | LCA + huella CO2 gratis (150K EUR) |

### 1.5 Tarjeta de Tarifas (Rate Card)

| Perfil | TechnoEng. | Iberia | Global | Mediterranean |
|--------|-----------|--------|--------|---------------|
| Director Proyecto | 165 EUR/h | 145 EUR/h | 180 EUR/h | 170 EUR/h |
| Jefe Disciplina | 140 EUR/h | 125 EUR/h | 115-155 EUR/h* | 145 EUR/h |
| Ingeniero Senior | 120 EUR/h | 105 EUR/h | 90-130 EUR/h* | 125 EUR/h |
| Ingeniero Proyecto | 95 EUR/h | 85 EUR/h | 70 EUR/h | 100 EUR/h |
| CAD Operator | 65 EUR/h | 55 EUR/h | 35 EUR/h* | 68 EUR/h |

*Global Process tiene tarifas duales: locales (Espana) vs internacionales (UK/Malasia). El CAD offshore a 35 EUR/h es la clave de su precio competitivo.

---

## 2. Correspondencia PDFs Demo <-> Modelo de Datos Frontend

### 2.1 Modelo de Datos (`economic_offers`)

| Campo DB | Disponible en PDF Demo | Ejemplo |
|----------|----------------------|---------|
| `total_price` | SI | 14.500.000 EUR (TechnoEng) |
| `currency` | SI | EUR (todos) |
| `price_breakdown` | SI | {ingenieria: 3.200.000, procura: 4.100.000, ...} |
| `payment_terms` | SI, diferenciado | "15% anticipo + hitos" (TechnoEng) |
| `payment_schedule` | SI, con tabla de hitos | [{milestone: "Anticipo", percent: 15, event: "Firma"}...] |
| `discount_percentage` | SI, diferenciado | 2% pronto pago (TechnoEng), 0% (Iberia) |
| `discount_conditions` | SI | "Dentro de 15 dias" / "Adjudicacion EPC" |
| `tco_value` | SI (calculable) | CAPEX + 10 x OPEX |
| `tco_period_years` | SI | 10 anos (estandar en todos) |
| `tco_breakdown` | SI | {capex: 14.500.000, opex_annual: 1.140.000} |
| `validity_days` | SI, diferenciado | 90 / 120 / 60 / 90 dias |
| `price_escalation` | SI (solo Global) | "Revisable anualmente conforme IPC" |
| `guarantees` | SI, diferenciado | "Aval 10%, RC 10M, garantia 18 meses" |
| `insurance_included` | SI | Detallado en Anexos (polizas completas) |
| `extraction_confidence` | N/A | Generado por IA al extraer |

**Veredicto:** Los PDFs demo cubren el 100% de los campos del modelo `economic_offers`. La IA deberia poder extraer todos los datos estructurados.

### 2.2 Estructura CAPEX Estandarizada

Los 4 proveedores usan la **misma estructura CAPEX de 4 partidas**, alineada con la RFP:

```
A.1 Ingenieria (con desglose por disciplina + horas estimadas)
A.2 Procura (con desglose por tipo de material)
A.3 Construccion (con desglose por actividad)
A.4 Commissioning (con desglose pre-comm / mecanico / control / puesta en marcha)
```

Esto elimina el GAP anterior de "no normalizacion de price_breakdown" - todos los proveedores usan las mismas claves.

---

## 3. Analisis de Sensibilidad (incluido en PDFs)

Cada oferta economica incluye un analisis de sensibilidad +/- 10% y +/- 20% del CAPEX, con las principales variables identificadas:

- Precios de equipos principales: +/- 12%
- Mano de obra cualificada: +/- 8%
- Materiales (acero, cobre): +/- 15%
- Tipo de cambio EUR/USD: +/- 5%
- Productividad en obra: +/- 10%

Esto enriquece la evaluacion y permite a Mariano entender el rango de incertidumbre.

---

## 4. Gaps que Persisten para la Demo

### 4.1 GAP CRITICO: Desconexion scoring <-> datos economicos

**Sigue vigente.** La tabla `economic_offers` almacena precios reales, pero `ranking_proveedores` usa scores cualitativos IA (0-10) que NO se derivan de esos precios.

**Riesgo demo:** Si Global Process ofrece 11.35M (el mas barato) pero su score economico IA no es el mas alto, Mariano lo notara.

**Recomendacion:** Para demo, usar formula cuantitativa: `score = 10 * (min_price / provider_price)`

| Proveedor | CAPEX | Score (formula) |
|-----------|-------|----------------|
| Global Process Eng. | 11.350.000 | 10.00 |
| Iberia Industrial | 13.000.000 | 8.73 |
| TechnoEngineering | 14.500.000 | 7.83 |
| MediterraneanEPC | 15.700.000 | 7.23 |

### 4.2 GAP: Datos demo del boton "Cargar demo" son otros proveedores

El boton demo en `EconomicSection.tsx` carga: Siemens, ABB, Schneider, Eaton, GE Vernova.
Los PDFs demo usan: TechnoEngineering, Iberia Industrial, Global Process, MediterraneanEPC.

**Accion necesaria:** Actualizar el boton demo o crear un seed SQL con los datos de los 4 proveedores de los PDFs.

### 4.3 GAP: Vista economica y dashboard ejecutivo siguen separados

- `EconomicSection.tsx` lee de `economic_offers` (precios reales)
- `ExecutiveView.tsx` lee de `ranking_proveedores` (scores IA)
- No hay componente que integre ambos

### 4.4 GAP RESUELTO: Condiciones comerciales identicas

**RESUELTO.** Los 4 proveedores ahora tienen condiciones completamente diferenciadas (anticipo, descuentos, garantias, seguros, validez).

### 4.5 GAP RESUELTO: Estructura CAPEX no normalizada

**RESUELTO.** Todos los proveedores usan la misma estructura de 4 partidas CAPEX y 4 partidas OPEX, facilitando la comparacion apple-to-apple.

---

## 5. Scoring Economico Recomendado

### 5.1 Scoring Hibrido (Cuantitativo + Cualitativo)

| Criterio | Peso | Metodo | Fuente de Datos |
|----------|------|--------|----------------|
| `total_price` | 42.86% | **Cuantitativo** (formula inversa) | `economic_offers.total_price` |
| `price_breakdown` | 22.86% | **Cualitativo IA** (transparencia) | PDF: desglose por disciplina |
| `optionals_included` | 20.00% | **Semi-cuantitativo** | PDF: secciones 5.4 y 5.5 |
| `capex_opex_methodology` | 14.28% | **Cualitativo IA** | PDF: analisis sensibilidad, rate card |

### 5.2 Factores Diferenciadores por Proveedor (para scoring cualitativo)

| Proveedor | Fortaleza Economica | Debilidad Economica |
|-----------|-------------------|-------------------|
| TechnoEng. | Dto. pronto pago, dto. EPC | Precio medio-alto |
| Iberia Ind. | Precio firme, 120 dias validez | Sin descuentos adicionales |
| Global Proc. | CAPEX mas bajo, tarifas offshore bajas | Precios revisables, aval solo 5%, exclusiones amplias |
| Mediterranean | Valor anadido 150K gratis, mejor garantia | CAPEX y OPEX mas altos |

---

## 6. Ponderacion Recomendada para Demo

| Categoria | Peso |
|-----------|------|
| Technical Completeness | 30% |
| **Economic Competitiveness** | **35%** |
| Execution Capability | 20% |
| HSE & Compliance | 15% |

Esta ponderacion refleja un proyecto industrial tipico donde el precio es relevante pero no dominante. Para sector publico (LCSP), el peso economico subiria al 40-50%.

---

## 7. Resumen de Acciones para Demo

### Inmediato (P0)
1. Actualizar boton "Cargar demo" o seed SQL con datos de los 4 proveedores reales
2. Calibrar scores en `ranking_proveedores` coherentes con precios reales
3. Verificar que n8n extrae correctamente los datos de los PDFs demo

### Post-demo (P1)
4. Implementar formula cuantitativa para `total_price_score`
5. Integrar `economic_offers` con `ranking_proveedores` en un componente unificado
6. Anadir vista comparativa CAPEX/OPEX dedicada

### Futuro (P2)
7. NPV para comparacion TCO justa
8. Factor de ajuste por condiciones de pago
9. Dashboard de sensibilidad interactivo
