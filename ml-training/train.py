from ultralytics import YOLO
from pathlib import Path
import os
from dotenv import load_dotenv
import yaml

load_dotenv()

class YOLOTrainer:
    def __init__(self, dataset_config_path='dataset/dataset.yaml', model_size='n'):
        """
        Initialize YOLO trainer
        
        Args:
            dataset_config_path: Path to dataset YAML config
            model_size: Model size ('n', 's', 'm', 'l', 'x')
        """
        self.dataset_config = dataset_config_path
        self.model_size = model_size
        self.model_name = f'yolov8{model_size}.pt'
        
        # Load pretrained model
        self.model = YOLO(self.model_name)
    
    def train(self, epochs=100, imgsz=640, batch=16, patience=50):
        """
        Train YOLO model
        
        Args:
            epochs: Number of training epochs
            imgsz: Image size
            batch: Batch size
            patience: Early stopping patience
        """
        print(f"Starting training with model: {self.model_name}")
        print(f"Dataset config: {self.dataset_config}")
        
        # Train the model
        results = self.model.train(
            data=self.dataset_config,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            patience=patience,
            save=True,
            project='runs/detect',
            name='aloe_vera_training',
            exist_ok=True,
            pretrained=True,
            optimizer='AdamW',
            lr0=0.01,
            lrf=0.01,
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3,
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            box=7.5,
            cls=0.5,
            dfl=1.5,
            pose=12.0,
            kobj=1.0,
            label_smoothing=0.0,
            nbs=64,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=0.0,
            translate=0.1,
            scale=0.5,
            shear=0.0,
            perspective=0.0,
            flipud=0.0,
            fliplr=0.5,
            mosaic=1.0,
            mixup=0.0,
            copy_paste=0.0
        )
        
        print("\nTraining completed!")
        print(f"Best model saved to: {results.save_dir}")
        
        return results
    
    def validate(self, model_path=None):
        """
        Validate trained model
        
        Args:
            model_path: Path to trained model (uses best.pt if None)
        """
        if model_path is None:
            # Find the best model from latest training run
            runs_dir = Path('runs/detect')
            if runs_dir.exists():
                latest_run = max(runs_dir.iterdir(), key=os.path.getctime)
                model_path = latest_run / 'weights' / 'best.pt'
        
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        model = YOLO(model_path)
        
        # Run validation
        metrics = model.val(data=self.dataset_config)
        
        print("\nValidation Results:")
        print(f"mAP50: {metrics.box.map50}")
        print(f"mAP50-95: {metrics.box.map}")
        print(f"Precision: {metrics.box.mp}")
        print(f"Recall: {metrics.box.mr}")
        
        return metrics

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train YOLO model for Aloe Vera disease detection')
    parser.add_argument('--dataset', type=str, default='dataset/dataset.yaml',
                       help='Path to dataset config YAML')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    parser.add_argument('--batch', type=int, default=16,
                       help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size')
    parser.add_argument('--model-size', type=str, default='n',
                       choices=['n', 's', 'm', 'l', 'x'],
                       help='Model size')
    parser.add_argument('--validate-only', action='store_true',
                       help='Only validate, do not train')
    parser.add_argument('--model-path', type=str, default=None,
                       help='Path to model for validation')
    
    args = parser.parse_args()
    
    trainer = YOLOTrainer(
        dataset_config_path=args.dataset,
        model_size=args.model_size
    )
    
    if args.validate_only:
        trainer.validate(args.model_path)
    else:
        trainer.train(
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz
        )
        # Validate after training
        trainer.validate()

