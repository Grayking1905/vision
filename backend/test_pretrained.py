import requests, json

BASE = 'http://localhost:8000/api/v1'

def run_tests():
    print("--- Starting Backend Tests ---")
    
    # 1. Create project
    res = requests.post(f'{BASE}/projects', json={'name': 'Pretrained Test', 'description': 'Testing'})
    res.raise_for_status()
    proj_id = res.json()['data']['id']
    print(f'1. Project ID: {proj_id}')

    # 2. Get Catalog
    res = requests.get(f'{BASE}/pretrained/catalog')
    res.raise_for_status()
    catalog = res.json()['models']
    print(f'2. Catalog items: {len(catalog)}')
    
    # 3. Load Model
    res = requests.post(f'{BASE}/pretrained/load', json={'base_model_key': 'mobilenet_v2', 'include_top': False, 'project_id': proj_id})
    res.raise_for_status()
    model_id = res.json()['data']['id']
    print(f'3. Loaded Model ID: {model_id}')

    # 4. Summary
    res = requests.get(f'{BASE}/pretrained/{model_id}/summary')
    res.raise_for_status()
    summary = res.json()
    print(f'4. Total Params: {summary.get("data", {}).get("total_params")}')

    # 5. Reverse Engineer
    res = requests.get(f'{BASE}/pretrained/{model_id}/reverse-engineer')
    res.raise_for_status()
    graph = res.json()
    print(f'5. Graph nodes: {len(graph.get("nodes", []))}, edges: {len(graph.get("edges", []))}')

    # 6. Save Fine-tune config
    config = {
        'pretrained_id': model_id,
        'file_id': 'dummy-file',
        'freeze_layers': 10,
        'custom_head': [{'units': 256, 'activation': 'relu'}, {'units': 128, 'activation': 'relu'}],
        'learning_rate': 0.005,
        'epochs': 5,
        'batch_size': 16,
        'problem_type': 1,
        'optimizer': 'adam',
        'project_id': proj_id
    }
    res = requests.patch(f'{BASE}/pretrained/fine-tune/config', json=config)
    res.raise_for_status()
    print(f'6. Config save: {res.json()["message"]}')

    # 7. Generate Code
    res = requests.post(f'{BASE}/pretrained/fine-tune/code', json={'pretrained_id': model_id, 'project_id': proj_id})
    res.raise_for_status()
    code = res.text
    print(f'7. Generated Code length: {len(code)}')
    
    print("--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    run_tests()
