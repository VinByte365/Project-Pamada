from ultralytics import YOLO
from pathlib import Path
import json
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns

class ModelEvaluator:
    def __init__(self, model_path, dataset_config):
        """
        Initialize model evaluator
        
        Args:
            model_path: Path to trained model
            dataset_config: Path to dataset config YAML
        """
        self.model = YOLO(model_path)
        self.dataset_config = dataset_config
        
        # Load class names
        with open(dataset_config, 'r') as f:
            import yaml
            config = yaml.safe_load(f)
            self.class_names = config['names']
    
    def evaluate(self, split='test'):
        """
        Evaluate model on test set
        
        Args:
            split: Dataset split to evaluate ('test', 'val', 'train')
        """
        # Run validation
        metrics = self.model.val(data=self.dataset_config, split=split)
        
        # Generate detailed report
        report = {
            'mAP50': float(metrics.box.map50),
            'mAP50_95': float(metrics.box.map),
            'precision': float(metrics.box.mp),
            'recall': float(metrics.box.mr),
            'f1_score': 2 * (metrics.box.mp * metrics.box.mr) / (metrics.box.mp + metrics.box.mr) if (metrics.box.mp + metrics.box.mr) > 0 else 0
        }
        
        print("\n" + "="*50)
        print("EVALUATION RESULTS")
        print("="*50)
        print(f"mAP@0.5: {report['mAP50']:.4f}")
        print(f"mAP@0.5:0.95: {report['mAP50_95']:.4f}")
        print(f"Precision: {report['precision']:.4f}")
        print(f"Recall: {report['recall']:.4f}")
        print(f"F1 Score: {report['f1_score']:.4f}")
        print("="*50)
        
        return report, metrics
    
    def generate_confusion_matrix(self, test_images_dir, output_path='confusion_matrix.png'):
        """
        Generate confusion matrix
        
        Args:
            test_images_dir: Directory containing test images
            output_path: Path to save confusion matrix
        """
        # This is a simplified version
        # In production, you would run inference on test set and compare with ground truth
        print("Confusion matrix generation requires ground truth labels")
        print("This would be implemented with actual test set evaluation")
    
    def compare_models(self, model_paths, output_path='model_comparison.json'):
        """
        Compare multiple models
        
        Args:
            model_paths: List of model paths to compare
            output_path: Path to save comparison results
        """
        results = {}
        
        for model_path in model_paths:
            model = YOLO(model_path)
            metrics = model.val(data=self.dataset_config)
            
            results[model_path] = {
                'mAP50': float(metrics.box.map50),
                'mAP50_95': float(metrics.box.map),
                'precision': float(metrics.box.mp),
                'recall': float(metrics.box.mr)
            }
        
        # Save results
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nModel comparison saved to {output_path}")
        
        # Print comparison
        print("\n" + "="*50)
        print("MODEL COMPARISON")
        print("="*50)
        for model_path, metrics in results.items():
            print(f"\n{Path(model_path).name}:")
            print(f"  mAP@0.5: {metrics['mAP50']:.4f}")
            print(f"  mAP@0.5:0.95: {metrics['mAP50_95']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall: {metrics['recall']:.4f}")
        
        return results

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate YOLO model')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to trained model')
    parser.add_argument('--dataset', type=str, default='dataset/dataset.yaml',
                       help='Path to dataset config')
    parser.add_argument('--split', type=str, default='test',
                       choices=['test', 'val', 'train'],
                       help='Dataset split to evaluate')
    
    args = parser.parse_args()
    
    evaluator = ModelEvaluator(args.model, args.dataset)
    evaluator.evaluate(args.split)

