#!/usr/bin/env python3
"""
Script para adaptar el workflow n8n de produccion al project_type (RFP/RFQ/RFI).
Modifica nodos especificos por indice para inyectar logica type-aware.

Cambios:
1. Set Nodes: Extraer project_type del payload
2. Code Nodes: Propagar project_type en output
3. LLM Prompts: Contexto type-aware
4. Conditional Logic: Saltar economic para RFI
5. Prepare Scoring Data: Defaults por tipo
"""

import json
import copy
import sys
import uuid

WORKFLOW_PATH = "workflow n8n/Workflow-produccion.json"

def load_workflow():
    with open(WORKFLOW_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_workflow(data):
    import os, tempfile
    # Serialize to string first to catch any encoding errors before touching the file
    output = json.dumps(data, indent=2, ensure_ascii=False)
    # Write to temp file, then atomic rename
    dir_name = os.path.dirname(os.path.abspath(WORKFLOW_PATH))
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix='.json')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(output)
            f.write('\n')
        os.replace(tmp_path, WORKFLOW_PATH)
    except:
        os.unlink(tmp_path)
        raise

def verify_node(data, index, expected_name):
    node = data['nodes'][index]
    actual_name = node.get('name', '')
    if actual_name != expected_name:
        print(f"  ERROR: Indice {index} esperado '{expected_name}', encontrado '{actual_name}'")
        sys.exit(1)
    print(f"  OK: [{index}] {actual_name}")
    return node


# ============================================================
# CAMBIO 1: Set Nodes — Extraer project_type del payload
# ============================================================
def apply_change_1(data):
    print("\n=== CAMBIO 1: Set Nodes — Extraer project_type ===")

    # Set File ID (index 97) — flujo ofertas
    node97 = verify_node(data, 97, "Set File ID")
    assignments = node97['parameters']['assignments']['assignments']
    # Check if already added
    if not any(a['name'] == 'project_type' for a in assignments):
        assignments.append({
            "id": "project-type-field-001",
            "name": "project_type",
            "value": "={{ $json.body.project_type || $json.body.metadata.project_type || 'RFP' }}",
            "type": "string"
        })
        print("    + Set File ID: project_type assignment added")
    else:
        print("    ~ Set File ID: project_type already exists, skipping")

    # Set Input Params (index 131) — QA audit
    node131 = verify_node(data, 131, "Set Input Params")
    assignments131 = node131['parameters']['assignments']['assignments']
    if not any(a['name'] == 'project_type' for a in assignments131):
        assignments131.append({
            "id": "project-type-field-qa",
            "name": "project_type",
            "value": "={{ $json.body.project_type || 'RFP' }}",
            "type": "string"
        })
        print("    + Set Input Params: project_type assignment added")
    else:
        print("    ~ Set Input Params: project_type already exists, skipping")

    # Set Input Params1 (index 207) — Scoring
    node207 = verify_node(data, 207, "Set Input Params1")
    assignments207 = node207['parameters']['assignments']['assignments']
    if not any(a['name'] == 'project_type' for a in assignments207):
        assignments207.append({
            "id": "project-type-field-scoring",
            "name": "project_type",
            "value": "={{ $('Webhook Scoring').first().json.body.project_type || 'RFP' }}",
            "type": "string"
        })
        print("    + Set Input Params1: project_type assignment added")
    else:
        print("    ~ Set Input Params1: project_type already exists, skipping")


# ============================================================
# CAMBIO 2: Code Nodes — Propagar project_type en output
# ============================================================
def apply_change_2(data):
    print("\n=== CAMBIO 2: Code Nodes — Propagar project_type ===")

    # Code in JavaScript1 (index 117) — ofertas
    node117 = verify_node(data, 117, "Code in JavaScript1")
    code = node117['parameters']['jsCode']

    if 'project_type' not in code:
        # Insert extraction after metadata extraction block
        old_extract = "const metadata = body.metadata || {};"
        new_extract = """const metadata = body.metadata || {};
const projectType = body.project_type || metadata.project_type || 'RFP';"""
        code = code.replace(old_extract, new_extract, 1)

        # Add to root return json
        old_return_root = "modo_operacion: modoOperacion,"
        new_return_root = """modo_operacion: modoOperacion,
    project_type: projectType,"""
        code = code.replace(old_return_root, new_return_root, 1)

        # Add to nested body
        old_return_body = "modo_operacion: modoOperacion,\n      datos_usuario_completos: datosCompletos\n    }"
        new_return_body = """modo_operacion: modoOperacion,
      datos_usuario_completos: datosCompletos,
      project_type: projectType
    }"""
        code = code.replace(old_return_body, new_return_body, 1)

        node117['parameters']['jsCode'] = code
        print("    + Code in JavaScript1: project_type propagated")
    else:
        print("    ~ Code in JavaScript1: project_type already present, skipping")

    # Generate IDs1 (index 160) — RFQ base
    node160 = verify_node(data, 160, "Generate IDs1")
    code160 = node160['parameters']['jsCode']

    if 'project_type' not in code160:
        # Insert extraction
        old_extract160 = "const language = body.language || metadata.language || 'es';"
        new_extract160 = """const language = body.language || metadata.language || 'es';
const projectType = body.project_type || metadata.project_type || 'RFP';"""
        code160 = code160.replace(old_extract160, new_extract160, 1)

        # Add to return json — after language field
        old_return160 = "// Idioma para salidas LLM\n    language: language,"
        new_return160 = """// Idioma para salidas LLM
    language: language,

    // Tipo de proyecto (RFP/RFQ/RFI)
    project_type: projectType,"""
        code160 = code160.replace(old_return160, new_return160, 1)

        node160['parameters']['jsCode'] = code160
        print("    + Generate IDs1: project_type propagated")
    else:
        print("    ~ Generate IDs1: project_type already present, skipping")


# ============================================================
# CAMBIO 3: LLM Prompts — Contexto type-aware
# ============================================================
def apply_change_3(data):
    print("\n=== CAMBIO 3: LLM Prompts — Contexto type-aware ===")

    # --- Node 94 (LLM Chain) — evaluacion principal ---
    node94 = verify_node(data, 94, "LLM Chain")
    text94 = node94['parameters']['text']

    PROJECT_TYPE_BLOCK_94 = """### TIPO DE PROYECTO: {{ $('Set File ID').first().json.project_type || 'RFP' }}
{{ $('Set File ID').first().json.project_type === 'RFI' ? '**MODO RFI**: Este es un Request for Information. Evalua SOLO capacidad tecnica y experiencia. NO evalues precios ni condiciones economicas. Si encuentras informacion economica, ignorala.' : ($('Set File ID').first().json.project_type === 'RFQ' ? '**MODO RFQ**: Este es un Request for Quotation. PRIORIZA la evaluacion economica: precios, condiciones de pago, descuentos y competitividad. La evaluacion tecnica es secundaria.' : '**MODO RFP**: Evaluacion equilibrada tecnica + economica.') }}

"""

    if 'TIPO DE PROYECTO' not in text94:
        # Insert after "### IDIOMA DE RESPUESTA" line
        marker = "### IDIOMA DE RESPUESTA"
        idx = text94.find(marker)
        if idx >= 0:
            # Find end of the IDIOMA block (next ### or double newline after the block)
            # Insert after the IMPORTANTE line — find the next blank line after IDIOMA section
            after_marker = text94[idx:]
            # Find the double newline that ends the IDIOMA section
            end_of_idioma = after_marker.find("\n\n")
            if end_of_idioma >= 0:
                insert_pos = idx + end_of_idioma + 2
                text94 = text94[:insert_pos] + PROJECT_TYPE_BLOCK_94 + text94[insert_pos:]
            else:
                # Fallback: insert right after the marker line
                end_of_line = text94.find("\n", idx)
                insert_pos = end_of_line + 1
                text94 = text94[:insert_pos] + "\n" + PROJECT_TYPE_BLOCK_94 + text94[insert_pos:]
        node94['parameters']['text'] = text94
        print("    + LLM Chain (94) text: project_type block inserted")
    else:
        print("    ~ LLM Chain (94) text: project_type already present, skipping")

    # Update system message for node 94
    msg94 = node94['parameters']['messages']['messageValues'][0]['message']
    if 'PROJECT TYPE' not in msg94:
        msg94 = msg94.rstrip() + "\n- PROJECT TYPE: {{ $('Set File ID').first().json.project_type || 'RFP' }}. Adjust evaluation focus accordingly."
        node94['parameters']['messages']['messageValues'][0]['message'] = msg94
        print("    + LLM Chain (94) system msg: PROJECT TYPE appended")
    else:
        print("    ~ LLM Chain (94) system msg: PROJECT TYPE already present, skipping")

    # --- Node 196 (Scoring LLM Chain) ---
    node196 = verify_node(data, 196, "Scoring LLM Chain")
    text196 = node196['parameters']['text']

    SCORING_TYPE_BLOCK = """
PROJECT TYPE: {{ $('Set Input Params1').first().json.project_type || 'RFP' }}
{{ $('Set Input Params1').first().json.project_type === 'RFI' ? 'MODE: Request for Information. Focus scoring ONLY on technical capability and execution capacity. IGNORE economic categories — set all economic scores to 0. The overall score should reflect only technical and execution merit.' : ($('Set Input Params1').first().json.project_type === 'RFQ' ? 'MODE: Request for Quotation. EMPHASIZE economic scoring — price competitiveness is the primary differentiator. Technical capability is a qualifying factor, not a differentiator.' : 'MODE: Request for Proposal. Balanced evaluation across all categories.') }}
"""

    if 'PROJECT TYPE' not in text196:
        marker196 = "PROJECT CONTEXT:"
        idx196 = text196.find(marker196)
        if idx196 >= 0:
            # Find end of the PROJECT CONTEXT line
            end_of_line196 = text196.find("\n", idx196)
            if end_of_line196 >= 0:
                insert_pos196 = end_of_line196 + 1
                text196 = text196[:insert_pos196] + SCORING_TYPE_BLOCK + text196[insert_pos196:]
            else:
                text196 = text196 + "\n" + SCORING_TYPE_BLOCK
        node196['parameters']['text'] = text196
        print("    + Scoring LLM Chain (196): PROJECT TYPE block inserted")
    else:
        print("    ~ Scoring LLM Chain (196): PROJECT TYPE already present, skipping")

    # --- Node 136 (QA Generation Chain) ---
    node136 = verify_node(data, 136, "QA Generation Chain")
    text136 = node136['parameters']['text']

    QA_TYPE_BLOCK = """
**PROJECT TYPE**: {{ $('Set Input Params').first().json.project_type || 'RFP' }}
{{ $('Set Input Params').first().json.project_type === 'RFI' ? '**RFI MODE**: Generate questions focused on technical capability, experience, and information completeness. Do NOT generate questions about pricing or commercial terms.' : ($('Set Input Params').first().json.project_type === 'RFQ' ? '**RFQ MODE**: Prioritize questions about pricing clarity, payment conditions, cost breakdown, and commercial terms. Include technical questions only when pricing depends on technical scope.' : '**RFP MODE**: Generate balanced questions covering both technical gaps and commercial/pricing clarifications.') }}
"""

    if 'PROJECT TYPE' not in text136:
        marker136 = "**CURRENCY**"
        idx136 = text136.find(marker136)
        if idx136 >= 0:
            end_of_line136 = text136.find("\n", idx136)
            if end_of_line136 >= 0:
                insert_pos136 = end_of_line136 + 1
                text136 = text136[:insert_pos136] + QA_TYPE_BLOCK + text136[insert_pos136:]
        node136['parameters']['text'] = text136
        print("    + QA Generation Chain (136): PROJECT TYPE block inserted")
    else:
        print("    ~ QA Generation Chain (136): PROJECT TYPE already present, skipping")

    # --- Node 126 (Extract Economic Data) ---
    node126 = verify_node(data, 126, "Extract Economic Data")
    # This node uses messages (system) + text (user)
    text126 = node126['parameters']['text']

    ECON_TYPE_BLOCK = """## TIPO DE PROYECTO: {{ $('Set File ID').first().json.project_type || 'RFP' }}
{{ $('Set File ID').first().json.project_type === 'RFQ' ? 'PRIORIDAD MAXIMA: Extrae TODOS los datos economicos con el mayor detalle posible. Busca desglose por partida, condiciones de pago, descuentos, penalizaciones y cualquier informacion financiera.' : 'Extrae los datos economicos disponibles.' }}

"""

    if 'TIPO DE PROYECTO' not in text126:
        # Insert after the title line "### PROPUESTA DE PROVEEDOR"
        marker126 = "### PROPUESTA DE PROVEEDOR"
        idx126 = text126.find(marker126)
        if idx126 >= 0:
            end_of_line126 = text126.find("\n", idx126)
            if end_of_line126 >= 0:
                insert_pos126 = end_of_line126 + 2  # after the newline
                text126 = text126[:insert_pos126] + ECON_TYPE_BLOCK + text126[insert_pos126:]
        node126['parameters']['text'] = text126
        print("    + Extract Economic Data (126): TIPO DE PROYECTO block inserted")
    else:
        print("    ~ Extract Economic Data (126): TIPO DE PROYECTO already present, skipping")


# ============================================================
# CAMBIO 4: Conditional Logic — Saltar economic para RFI
# ============================================================
def apply_change_4(data):
    print("\n=== CAMBIO 4: Has Economic Evaluation? — Saltar para RFI ===")

    node123 = verify_node(data, 123, "Has Economic Evaluation?")
    conditions = node123['parameters']['conditions']

    # Check if RFI condition already exists
    existing_conditions = conditions.get('conditions', [])
    has_rfi_check = any(
        'project_type' in str(c.get('leftValue', '')) or 'RFI' in str(c.get('rightValue', ''))
        for c in existing_conditions
    )

    if not has_rfi_check:
        # Add second condition: project_type != 'RFI'
        existing_conditions.append({
            "id": "check-not-rfi-type",
            "leftValue": "={{ $('Set File ID').first().json.project_type || 'RFP' }}",
            "rightValue": "RFI",
            "operator": {
                "type": "string",
                "operation": "notEquals"
            }
        })
        conditions['conditions'] = existing_conditions
        # Ensure combinator is AND
        conditions['combinator'] = "and"
        node123['parameters']['conditions'] = conditions
        print("    + Has Economic Evaluation?: RFI exclusion condition added")
    else:
        print("    ~ Has Economic Evaluation?: RFI condition already exists, skipping")


# ============================================================
# CAMBIO 5: Prepare Scoring Data — Defaults por tipo
# ============================================================
def apply_change_5(data):
    print("\n=== CAMBIO 5: Prepare Scoring Data — Defaults por tipo ===")

    node194 = verify_node(data, 194, "Prepare Scoring Data")
    code = node194['parameters']['jsCode']

    if 'DEFAULT_WEIGHTS_BY_TYPE' not in code:
        # 1. Add project_type extraction after projectId extraction
        old_project_id = """} catch (e) {
    console.log('   \u26a0\ufe0f Could not get project_id:', e.message);
}"""
        new_project_id = """} catch (e) {
    console.log('   \u26a0\ufe0f Could not get project_id:', e.message);
}

/* =========================
Get project_type from webhook
========================= */
let projectType = 'RFP';
try {
    projectType = $('Set Input Params1').first().json.project_type || 'RFP';
    console.log('   [TYPE] Project Type:', projectType);
} catch (e) {
    console.log('   [WARN] Could not get project_type, defaulting to RFP');
}"""
        code = code.replace(old_project_id, new_project_id, 1)

        # 2. Replace DEFAULT constants with type-aware defaults
        old_defaults = """const DEFAULT_CRITERIA_WEIGHTS = {
    scope_facilities: 0.10,
    scope_work: 0.10,
    deliverables_quality: 0.10,
    total_price: 0.15,
    price_breakdown: 0.08,
    optionals_included: 0.07,
    capex_opex_methodology: 0.05,
    schedule: 0.08,
    resources_allocation: 0.06,
    exceptions: 0.06,
    safety_studies: 0.08,
    regulatory_compliance: 0.07
};

const DEFAULT_CATEGORY_WEIGHTS = {
    TECHNICAL: 0.30,
    ECONOMIC: 0.35,
    EXECUTION: 0.20,
    HSE_COMPLIANCE: 0.15
};"""

        new_defaults = """// Type-aware default weights
const DEFAULT_WEIGHTS_BY_TYPE = {
    RFP: {
        criteria: {
            scope_facilities: 0.10, scope_work: 0.10, deliverables_quality: 0.10,
            total_price: 0.15, price_breakdown: 0.08, optionals_included: 0.07,
            capex_opex_methodology: 0.05, schedule: 0.08, resources_allocation: 0.06,
            exceptions: 0.06, safety_studies: 0.08, regulatory_compliance: 0.07
        },
        categories: { TECHNICAL: 0.30, ECONOMIC: 0.35, EXECUTION: 0.20, HSE_COMPLIANCE: 0.15 }
    },
    RFQ: {
        criteria: {
            scope_facilities: 0.06, scope_work: 0.06, deliverables_quality: 0.06,
            total_price: 0.22, price_breakdown: 0.12, optionals_included: 0.10,
            capex_opex_methodology: 0.08, schedule: 0.06, resources_allocation: 0.04,
            exceptions: 0.04, safety_studies: 0.08, regulatory_compliance: 0.08
        },
        categories: { TECHNICAL: 0.18, ECONOMIC: 0.52, EXECUTION: 0.14, HSE_COMPLIANCE: 0.16 }
    },
    RFI: {
        criteria: {
            scope_facilities: 0.18, scope_work: 0.18, deliverables_quality: 0.18,
            schedule: 0.12, resources_allocation: 0.12, exceptions: 0.10,
            safety_studies: 0.06, regulatory_compliance: 0.06
        },
        categories: { TECHNICAL: 0.54, EXECUTION: 0.34, HSE_COMPLIANCE: 0.12 }
    }
};

const typeDefaults = DEFAULT_WEIGHTS_BY_TYPE[projectType] || DEFAULT_WEIGHTS_BY_TYPE.RFP;
const DEFAULT_CRITERIA_WEIGHTS = typeDefaults.criteria;
const DEFAULT_CATEGORY_WEIGHTS = typeDefaults.categories;

console.log('   [TYPE] Project type:', projectType, '-> using', projectType, 'default weights');"""

        code = code.replace(old_defaults, new_defaults, 1)

        node194['parameters']['jsCode'] = code
        print("    + Prepare Scoring Data: type-aware defaults implemented")
    else:
        print("    ~ Prepare Scoring Data: type-aware defaults already present, skipping")


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("Adaptando workflow n8n para project_type (RFP/RFQ/RFI)")
    print("=" * 60)

    # Load
    data = load_workflow()
    num_nodes_before = len(data['nodes'])
    print(f"\nNodos antes: {num_nodes_before}")

    # Apply changes
    apply_change_1(data)
    apply_change_2(data)
    apply_change_3(data)
    apply_change_4(data)
    apply_change_5(data)

    # Verify
    num_nodes_after = len(data['nodes'])
    print(f"\nNodos despues: {num_nodes_after}")
    assert num_nodes_before == num_nodes_after, f"ERROR: Numero de nodos cambio de {num_nodes_before} a {num_nodes_after}!"

    # Save
    save_workflow(data)
    print("\n Workflow guardado exitosamente")

    # Validate JSON
    print("\nValidando JSON...")
    with open(WORKFLOW_PATH, 'r') as f:
        json.load(f)
    print(" JSON valido")

    print("\n" + "=" * 60)
    print("COMPLETADO - Todos los cambios aplicados")
    print("=" * 60)


if __name__ == "__main__":
    main()
