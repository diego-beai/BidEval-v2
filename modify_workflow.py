
import json
import uuid
import copy

INPUT_FILE = "workflow n8n/Workflow-completo.json"
OUTPUT_FILE = "workflow n8n/Workflow-completo.json"

def create_fetch_node(node_name, prev_node_name, position, credentials_id="pI4CpdYLTiEEBmnz"):
    return {
        "parameters": {
            "operation": "get",
            "tableId": "projects",
            "filters": {
                "conditions": [
                    {
                        "keyName": "id",
                        "condition": "eq",
                        "keyValue": "={{ $('" + prev_node_name + "').first().json.project_id }}"
                    }
                ]
            }
        },
        "id": str(uuid.uuid4()),
        "name": node_name,
        "type": "n8n-nodes-base.supabase",
        "typeVersion": 1,
        "position": [position[0] + 250, position[1]],
        "credentials": {
            "supabaseApi": {
                "id": credentials_id,
                "name": "Supabase account"
            }
        }
    }

def main():
    with open(INPUT_FILE, "r") as f:
        workflow = json.load(f)

    nodes = {n["name"]: n for n in workflow["nodes"]}
    connections = workflow["connections"]

    # --- Modification 1: Email Flow ---
    # Target: "Edit Fields" -> "Filter and Aggregate Issues"
    # Action: Insert "Fetch Project Context Email" in between.
    
    prev_node_name = "Edit Fields"
    next_node_name = "Filter and Aggregate Issues"
    new_node_name = "Fetch Project Context Email"

    if prev_node_name in nodes and next_node_name in nodes:
        print(f"Modifying Email Flow: {prev_node_name} -> {new_node_name} -> {next_node_name}")
        prev_node = nodes[prev_node_name]
        
        # Create new node
        new_node = create_fetch_node(new_node_name, prev_node_name, prev_node["position"])
        workflow["nodes"].append(new_node)
        nodes[new_node_name] = new_node

        # Update connections
        # 1. Remove connection from Prev to Next
        if prev_node_name in connections and "main" in connections[prev_node_name]:
             # Filter out the specific connection to next_node
             connections[prev_node_name]["main"][0] = [
                 conn for conn in connections[prev_node_name]["main"][0] 
                 if conn["node"] != next_node_name
             ]
        
        # 2. Add connection from Prev to New
        if prev_node_name not in connections: connections[prev_node_name] = {"main": [[]]}
        connections[prev_node_name]["main"][0].append({
            "node": new_node_name,
            "type": "main",
            "index": 0
        })

        # 3. Add connection from New to Next
        if new_node_name not in connections: connections[new_node_name] = {"main": [[]]}
        connections[new_node_name]["main"][0].append({
            "node": next_node_name,
            "type": "main",
            "index": 0
        })
        
        # 4. Update Next node (Filter and Aggregate Issues) to use the context? 
        # Actually, "Basic LLM Chain" is further down the line.
        # "Filter and Aggregate Issues" (Code node) also uses `$('Edit Fields').first().json.project_name`.
        # We need to make sure we don't break existing references.
        # The new node passes through the data? No, Supabase "get" returns the fetched row. 
        # CAUTION: If "Filter and Aggregate Issues" expects the output of "Edit Fields", inserting a node changes the input!
        # "Fetch Project Context" outputs the project row, NOT the "Edit Fields" output.
        # So "Filter and Aggregate Issues" will lose access to "Edit Fields" data via simple input.
        # LUCKILY, n8n nodes can reference ANY previous node by name: $('Edit Fields').first().json...
        # So as long as "Edit Fields" is executed upstream, the reference works.
        # The input item to "Filter and Aggregate Issues" might change, but the Code node explicitly calls `$('Edit Fields')`.
        # However, `const allOffers = $('Get Offers').all();` - waits on Get Offers?
        # Let's check: "Edit Fields" connects to "Filter and Aggregate Issues". 
        # AND "Get Offers" connects to "Filter and Aggregate Issues"? No, "Get Offers" is separate? 
        # Let's check connections of "Filter and Aggregate Issues".
        # It seems "Filter and Aggregate Issues" is a Code node that aggregates data.
        
        # Update LLM Chain Prompt
        llm_node_name = "Basic LLM Chain"
        if llm_node_name in nodes:
            llm_node = nodes[llm_node_name]
            prompt_text = llm_node["parameters"]["text"]
            context_injection = "\\n## PROJECT CONTEXT: {{ $('" + new_node_name + "').first().json.ai_context }}\\n"
            if "## PROJECT CONTEXT" not in prompt_text:
                # Insert before "### FINAL INSTRUCTIONS"
                if "### FINAL INSTRUCTIONS" in prompt_text:
                    llm_node["parameters"]["text"] = prompt_text.replace("### FINAL INSTRUCTIONS", context_injection + "\\n### FINAL INSTRUCTIONS")
                else:
                    llm_node["parameters"]["text"] += context_injection
                print(f"Updated prompt for {llm_node_name}")
    
    else:
        print("Skipping Email Flow modification: Nodes not found.")


    # --- Modification 2: QA Generation Flow ---
    # Target: "Set Input Params" -> "Fetch All Provider Responses"
    
    prev_node_name = "Set Input Params"
    next_node_name = "Fetch All Provider Responses"
    new_node_name = "Fetch Project Context QA"

    if prev_node_name in nodes and next_node_name in nodes:
        print(f"Modifying QA Flow: {prev_node_name} -> {new_node_name} -> {next_node_name}")
        prev_node = nodes[prev_node_name]
        
        # Create new node
        new_node = create_fetch_node(new_node_name, prev_node_name, prev_node["position"])
        workflow["nodes"].append(new_node)
        nodes[new_node_name] = new_node

        # Update connections
        if prev_node_name in connections and "main" in connections[prev_node_name]:
             connections[prev_node_name]["main"][0] = [
                 conn for conn in connections[prev_node_name]["main"][0] 
                 if conn["node"] != next_node_name
             ]
        
        if prev_node_name not in connections: connections[prev_node_name] = {"main": [[]]}
        connections[prev_node_name]["main"][0].append({ "node": new_node_name, "type": "main", "index": 0 })

        if new_node_name not in connections: connections[new_node_name] = {"main": [[]]}
        connections[new_node_name]["main"][0].append({ "node": next_node_name, "type": "main", "index": 0 })
        
        # Update LLM Chain Prompt
        llm_node_name = "QA Generation Chain"
        if llm_node_name in nodes:
            llm_node = nodes[llm_node_name]
            prompt_text = llm_node["parameters"]["text"]
            context_injection = "\\n## PROJECT CONTEXT: {{ $('" + new_node_name + "').first().json.ai_context }}\\n"
            if "## PROJECT CONTEXT" not in prompt_text:
                if "### INSTRUCTIONS:" in prompt_text:
                     llm_node["parameters"]["text"] = prompt_text.replace("### INSTRUCTIONS:", context_injection + "\\n### INSTRUCTIONS:")
                else:
                     llm_node["parameters"]["text"] += context_injection
                print(f"Updated prompt for {llm_node_name}")

    # --- Modification 3: Scoring Flow ---
    # Target: "Set Input Params1" -> ("Fetch Requirements", "Fetch Provider Responses", "Fetch Scoring Configuration")
    
    prev_node_name = "Set Input Params1"
    next_node_names = ["Fetch Requirements", "Fetch Provider Responses", "Fetch Scoring Configuration"]
    new_node_name = "Fetch Project Context Scoring"

    if prev_node_name in nodes:
        print(f"Modifying Scoring Flow: {prev_node_name} -> {new_node_name} -> {next_node_names}")
        prev_node = nodes[prev_node_name]
        
        # Create new node
        new_node = create_fetch_node(new_node_name, prev_node_name, prev_node["position"])
        workflow["nodes"].append(new_node)
        nodes[new_node_name] = new_node

        # Update connections
        if prev_node_name in connections and "main" in connections[prev_node_name]:
             # Remove connections to next nodes
             connections[prev_node_name]["main"][0] = [
                 conn for conn in connections[prev_node_name]["main"][0] 
                 if conn["node"] not in next_node_names
             ]
        
        # Connect Prev -> New
        if prev_node_name not in connections: connections[prev_node_name] = {"main": [[]]}
        connections[prev_node_name]["main"][0].append({ "node": new_node_name, "type": "main", "index": 0 })

        # Connect New -> Next nodes (One output to multiple nodes)
        if new_node_name not in connections: connections[new_node_name] = {"main": [[]]}
        for next_node in next_node_names:
            if next_node in nodes:
                connections[new_node_name]["main"][0].append({ "node": next_node, "type": "main", "index": 0 })
            
        # Update LLM Chain Prompt
        llm_node_name = "Scoring LLM Chain"
        if llm_node_name in nodes:
            llm_node = nodes[llm_node_name]
            prompt_text = llm_node["parameters"]["text"]
            context_injection = "\\n## PROJECT CONTEXT: {{ $('" + new_node_name + "').first().json.ai_context }}\\n"
            if "## PROJECT CONTEXT" not in prompt_text:
                # Insert comfortably
                if "## CONFIG TYPE:" in prompt_text:
                     llm_node["parameters"]["text"] = prompt_text.replace("## CONFIG TYPE:", context_injection + "\\n## CONFIG TYPE:")
                else:
                     llm_node["parameters"]["text"] += context_injection
                print(f"Updated prompt for {llm_node_name}")

    # Save
    with open(OUTPUT_FILE, "w") as f:
        json.dump(workflow, f, indent=2)
    print("Workflow updated successfully.")

if __name__ == "__main__":
    main()
