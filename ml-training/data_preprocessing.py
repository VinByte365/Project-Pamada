import os
import shutil
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from pymongo import MongoClient
from dotenv import load_dotenv
import json
from tqdm import tqdm

load_dotenv()

class DataPreprocessor:
    def __init__(self, output_dir='dataset'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Create directory structure
        (self.output_dir / 'train' / 'images').mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'train' / 'labels').mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'val' / 'images').mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'val' / 'labels').mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'test' / 'images').mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'test' / 'labels').mkdir(parents=True, exist_ok=True)
    
    def fetch_from_mongodb(self, limit=None):
        """
        Fetch validated training data from MongoDB
        """
        client = MongoClient(os.getenv('MONGO_URI'))
        db = client[os.getenv('MONGO_DB', 'aloe-vera')]
        collection = db.trainingdatasets
        
        query = {
            'validation_status': 'validated',
            'added_to_training': False
        }
        
        if limit:
            dataset = list(collection.find(query).limit(limit))
        else:
            dataset = list(collection.find(query))
        
        print(f"Fetched {len(dataset)} validated images from MongoDB")
        return dataset
    
    def download_images(self, dataset):
        """
        Download images from URLs and organize by label
        """
        import requests
        
        organized_data = {}
        
        for item in tqdm(dataset, desc="Downloading images"):
            label = item['label']
            image_url = item['image_url']
            
            if label not in organized_data:
                organized_data[label] = []
            
            try:
                response = requests.get(image_url, timeout=10)
                if response.status_code == 200:
                    organized_data[label].append({
                        'image_data': response.content,
                        'source_id': str(item['_id']),
                        'label': label
                    })
            except Exception as e:
                print(f"Error downloading image {image_url}: {str(e)}")
        
        return organized_data
    
    def augment_image(self, image):
        """
        Apply data augmentation to image
        """
        augmented_images = [image]  # Original
        
        # Horizontal flip
        flipped = cv2.flip(image, 1)
        augmented_images.append(flipped)
        
        # Brightness adjustment
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        hsv[:,:,2] = cv2.multiply(hsv[:,:,2], 1.2)  # Increase brightness
        bright = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
        augmented_images.append(bright)
        
        # Slight rotation
        center = (image.shape[1] // 2, image.shape[0] // 2)
        matrix = cv2.getRotationMatrix2D(center, 5, 1.0)
        rotated = cv2.warpAffine(image, matrix, (image.shape[1], image.shape[0]))
        augmented_images.append(rotated)
        
        return augmented_images
    
    def prepare_yolo_dataset(self, organized_data, train_split=0.7, val_split=0.2, augment=True):
        """
        Prepare dataset in YOLO format
        """
        class_names = [
            'healthy', 'leaf_spot', 'root_rot', 'sunburn', 'aloe_rust',
            'bacterial_soft_rot', 'anthracnose', 'scale_insect',
            'mealybug', 'spider_mite'
        ]
        
        class_to_id = {name: idx for idx, name in enumerate(class_names)}
        
        # Save class names
        with open(self.output_dir / 'classes.txt', 'w') as f:
            f.write('\n'.join(class_names))
        
        all_data = []
        
        # Flatten and organize data
        for label, items in organized_data.items():
            for item in items:
                all_data.append({
                    'image_data': item['image_data'],
                    'label': label,
                    'class_id': class_to_id.get(label, 0)
                })
        
        # Shuffle
        import random
        random.shuffle(all_data)
        
        # Split dataset
        total = len(all_data)
        train_end = int(total * train_split)
        val_end = train_end + int(total * val_split)
        
        train_data = all_data[:train_end]
        val_data = all_data[train_end:val_end]
        test_data = all_data[val_end:]
        
        # Process splits
        self._process_split(train_data, 'train', augment)
        self._process_split(val_data, 'val', False)
        self._process_split(test_data, 'test', False)
        
        print(f"\nDataset prepared:")
        print(f"  Train: {len(train_data)} images")
        print(f"  Val: {len(val_data)} images")
        print(f"  Test: {len(test_data)} images")
    
    def _process_split(self, data, split_name, augment):
        """
        Process a data split
        """
        for idx, item in enumerate(tqdm(data, desc=f"Processing {split_name}")):
            # Decode image
            image = np.frombuffer(item['image_data'], np.uint8)
            image = cv2.imdecode(image, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Apply augmentation if needed
            if augment:
                images = self.augment_image(image)
            else:
                images = [image]
            
            for aug_idx, img in enumerate(images):
                # Save image
                image_filename = f"{split_name}_{idx}_{aug_idx}.jpg"
                image_path = self.output_dir / split_name / 'images' / image_filename
                cv2.imwrite(str(image_path), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
                
                # Create YOLO format label file (for now, we'll use classification)
                # In full implementation, bounding boxes would be extracted from scan data
                label_filename = image_filename.replace('.jpg', '.txt')
                label_path = self.output_dir / split_name / 'labels' / label_filename
                
                # For classification, we'll create a placeholder
                # In production, this should contain bounding box annotations
                with open(label_path, 'w') as f:
                    # Format: class_id center_x center_y width height (normalized)
                    # For now, we'll use the full image as a bounding box
                    f.write(f"{item['class_id']} 0.5 0.5 1.0 1.0")
    
    def create_dataset_config(self):
        """
        Create YOLO dataset configuration file
        """
        config = {
            'path': str(self.output_dir.absolute()),
            'train': 'train/images',
            'val': 'val/images',
            'test': 'test/images',
            'nc': 10,  # Number of classes
            'names': [
                'healthy', 'leaf_spot', 'root_rot', 'sunburn', 'aloe_rust',
                'bacterial_soft_rot', 'anthracnose', 'scale_insect',
                'mealybug', 'spider_mite'
            ]
        }
        
        config_path = self.output_dir / 'dataset.yaml'
        with open(config_path, 'w') as f:
            import yaml
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"Dataset config saved to {config_path}")
        return config_path

if __name__ == '__main__':
    preprocessor = DataPreprocessor()
    
    # Fetch data from MongoDB
    dataset = preprocessor.fetch_from_mongodb(limit=1000)
    
    if len(dataset) == 0:
        print("No validated data found in MongoDB")
    else:
        # Download and organize
        organized_data = preprocessor.download_images(dataset)
        
        # Prepare YOLO dataset
        preprocessor.prepare_yolo_dataset(organized_data)
        
        # Create config
        preprocessor.create_dataset_config()

