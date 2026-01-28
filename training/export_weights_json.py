"""
Export Keras model weights to JSON format for pure JS inference
"""

import os
import json
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'app', 'assets', 'models')

def load_weights_from_bin(model_dir):
    """Load weights from TF.js bin file and model.json"""
    model_json_path = os.path.join(model_dir, 'model.json')
    weights_path = os.path.join(model_dir, 'group1-shard1of1.bin')

    with open(model_json_path, 'r') as f:
        model_json = json.load(f)

    # Read binary weights
    with open(weights_path, 'rb') as f:
        weights_data = f.read()

    # Parse weight specs from model.json
    weight_specs = model_json['weightsManifest'][0]['weights']

    weights = {}
    offset = 0

    for spec in weight_specs:
        name = spec['name']
        shape = spec['shape']
        dtype = spec['dtype']

        # Calculate size
        size = 1
        for dim in shape:
            size *= dim

        # Read bytes
        if dtype == 'float32':
            byte_size = size * 4
            arr = np.frombuffer(weights_data[offset:offset+byte_size], dtype=np.float32)
        else:
            raise ValueError(f"Unsupported dtype: {dtype}")

        weights[name] = arr.reshape(shape).tolist()
        offset += byte_size

    return weights, model_json

def export_model_weights():
    """Export both models to JSON"""
    for model_name in ['dual_threat', 'binary']:
        model_dir = os.path.join(MODELS_DIR, model_name)
        print(f"\nExporting {model_name}...")

        weights, model_json = load_weights_from_bin(model_dir)

        # Load normalization params
        norm_path = os.path.join(model_dir, 'normalization.json')
        with open(norm_path, 'r') as f:
            norm_params = json.load(f)

        # Create combined export
        export_data = {
            'weights': weights,
            'normalization': norm_params,
            'architecture': {
                'layers': []
            }
        }

        # Parse layer config from model.json
        for layer in model_json['modelTopology']['model_config']['config']['layers']:
            layer_config = layer['config']
            layer_info = {
                'class': layer['class_name'],
                'name': layer_config['name'],
            }

            if layer['class_name'] == 'Dense':
                layer_info['units'] = layer_config['units']
                layer_info['activation'] = layer_config['activation']
            elif layer['class_name'] == 'Dropout':
                layer_info['rate'] = layer_config['rate']

            export_data['architecture']['layers'].append(layer_info)

        # Save as JSON
        output_path = os.path.join(model_dir, 'model_weights.json')
        with open(output_path, 'w') as f:
            json.dump(export_data, f)

        print(f"  Exported to {output_path}")
        print(f"  Layers: {[l['class'] for l in export_data['architecture']['layers']]}")
        print(f"  Weights: {list(weights.keys())}")

if __name__ == '__main__':
    export_model_weights()
    print("\nDone! JSON weights ready for pure JS inference.")
