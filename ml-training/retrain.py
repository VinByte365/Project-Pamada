import os
import sys
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
from data_preprocessing import DataPreprocessor
from train import YOLOTrainer
from evaluate import ModelEvaluator
import json

load_dotenv()

class RetrainingPipeline:
    def __init__(self):
        self.min_new_images = int(os.getenv('MIN_NEW_IMAGES', 100))
        self.accuracy_threshold = float(os.getenv('ACCURACY_THRESHOLD', 0.8))
        self.model_output_dir = Path('models')
        self.model_output_dir.mkdir(exist_ok=True)
    
    def check_retraining_conditions(self):
        """
        Check if retraining conditions are met
        """
        client = MongoClient(os.getenv('MONGO_URI'))
        db = client[os.getenv('MONGO_DB', 'aloe-vera')]
        training_collection = db.trainingdatasets
        
        # Count new validated images
        new_images_count = training_collection.count_documents({
            'validation_status': 'validated',
            'added_to_training': False
        })
        
        print(f"New validated images: {new_images_count}")
        print(f"Minimum required: {self.min_new_images}")
        
        return new_images_count >= self.min_new_images
    
    def check_model_accuracy(self, model_path):
        """
        Check current model accuracy
        """
        try:
            evaluator = ModelEvaluator(model_path, 'dataset/dataset.yaml')
            report, _ = evaluator.evaluate(split='val')
            
            current_accuracy = report['mAP50']
            print(f"Current model mAP@0.5: {current_accuracy:.4f}")
            print(f"Threshold: {self.accuracy_threshold}")
            
            return current_accuracy < self.accuracy_threshold
        except Exception as e:
            print(f"Error checking model accuracy: {str(e)}")
            return False
    
    def retrain(self, model_size='n', epochs=100):
        """
        Execute retraining pipeline
        """
        print("="*50)
        print("RETRAINING PIPELINE")
        print("="*50)
        
        # Step 1: Check conditions
        print("\n1. Checking retraining conditions...")
        if not self.check_retraining_conditions():
            print("Retraining conditions not met. Exiting.")
            return False
        
        # Step 2: Prepare dataset
        print("\n2. Preparing dataset...")
        preprocessor = DataPreprocessor(output_dir='dataset')
        dataset = preprocessor.fetch_from_mongodb()
        
        if len(dataset) == 0:
            print("No validated data found. Exiting.")
            return False
        
        organized_data = preprocessor.download_images(dataset)
        preprocessor.prepare_yolo_dataset(organized_data, augment=True)
        dataset_config = preprocessor.create_dataset_config()
        
        # Step 3: Train new model
        print("\n3. Training new model...")
        trainer = YOLOTrainer(
            dataset_config_path=str(dataset_config),
            model_size=model_size
        )
        
        results = trainer.train(epochs=epochs)
        
        # Step 4: Evaluate new model
        print("\n4. Evaluating new model...")
        best_model_path = Path(results.save_dir) / 'weights' / 'best.pt'
        
        evaluator = ModelEvaluator(str(best_model_path), str(dataset_config))
        report, _ = evaluator.evaluate(split='test')
        
        # Step 5: Compare with current model
        print("\n5. Comparing with current model...")
        current_model_path = self.model_output_dir / 'yolov8_aloe_vera.pt'
        
        if current_model_path.exists():
            # Evaluate current model
            current_evaluator = ModelEvaluator(str(current_model_path), str(dataset_config))
            current_report, _ = current_evaluator.evaluate(split='test')
            
            print(f"\nCurrent model mAP@0.5: {current_report['mAP50']:.4f}")
            print(f"New model mAP@0.5: {report['mAP50']:.4f}")
            
            # Only deploy if new model is better
            if report['mAP50'] > current_report['mAP50']:
                print("\nNew model is better! Deploying...")
                self.deploy_model(best_model_path, current_model_path)
            else:
                print("\nNew model is not better. Keeping current model.")
        else:
            print("\nNo current model found. Deploying new model...")
            self.deploy_model(best_model_path, current_model_path)
        
        # Step 6: Mark images as added to training
        print("\n6. Updating database...")
        self.mark_images_as_trained()
        
        print("\n" + "="*50)
        print("RETRAINING COMPLETE")
        print("="*50)
        
        return True
    
    def deploy_model(self, new_model_path, target_path):
        """
        Deploy new model
        """
        import shutil
        
        # Copy new model to target location
        shutil.copy(new_model_path, target_path)
        print(f"Model deployed to {target_path}")
        
        # Also copy to ML service models directory
        ml_service_model_path = Path('../ml-service/models/yolov8_aloe_vera.pt')
        ml_service_model_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(new_model_path, ml_service_model_path)
        print(f"Model also copied to ML service: {ml_service_model_path}")
    
    def mark_images_as_trained(self):
        """
        Mark validated images as added to training
        """
        client = MongoClient(os.getenv('MONGO_URI'))
        db = client[os.getenv('MONGO_DB', 'aloe-vera')]
        training_collection = db.trainingdatasets
        
        result = training_collection.update_many(
            {
                'validation_status': 'validated',
                'added_to_training': False
            },
            {
                '$set': {
                    'added_to_training': True,
                    'training_batch': f'batch_{Path().cwd().name}'
                }
            }
        )
        
        print(f"Marked {result.modified_count} images as added to training")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Retrain YOLO model')
    parser.add_argument('--force', action='store_true',
                       help='Force retraining even if conditions not met')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    parser.add_argument('--model-size', type=str, default='n',
                       choices=['n', 's', 'm', 'l', 'x'],
                       help='Model size')
    
    args = parser.parse_args()
    
    pipeline = RetrainingPipeline()
    
    if args.force:
        pipeline.retrain(model_size=args.model_size, epochs=args.epochs)
    else:
        if pipeline.check_retraining_conditions():
            pipeline.retrain(model_size=args.model_size, epochs=args.epochs)
        else:
            print("Retraining conditions not met. Use --force to override.")

