import io
import os
from typing import Dict, List, Tuple

import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


class AloeVerifierService:
    def __init__(self):
        self.model_name = os.getenv('CLIP_MODEL_NAME', 'openai/clip-vit-base-patch32')
        self.threshold = float(os.getenv('ALOE_VERIFY_THRESHOLD', '0.22'))
        self.margin = float(os.getenv('ALOE_VERIFY_MARGIN', '0.015'))
        self.botanical_tolerance = float(os.getenv('ALOE_VERIFY_BOTANICAL_TOLERANCE', '0.03'))
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.processor = None
        self.model = None
        self._text_features = None

        self.positive_prompts = [
            'a photo of an aloe vera plant',
            'a photo of aloe vera leaves',
            'a close-up photo of an aloe vera succulent',
            'a mature aloe vera with serrated fleshy leaves',
            'an aloe vera rosette with thick green spiky leaves',
            'a healthy aloe vera plant in daylight',
            'an aloe vera medicinal succulent plant',
        ]
        self.botanical_negative_prompts = [
            'a photo of a snake plant',
            'a photo of a cactus',
            'a photo of an agave plant',
            'a photo of a haworthia plant',
            'a photo of an artificial plastic plant',
            'a photo of a fake decorative succulent',
        ]
        self.nonplant_negative_prompts = [
            'a photo of grass',
            'a photo of a tree',
            'a photo of a flower',
            'a photo of a person',
            'a photo of a cat',
            'a photo of a dog',
        ]
        self.candidate_prompts = [
            *self.positive_prompts,
            *self.botanical_negative_prompts,
            *self.nonplant_negative_prompts,
        ]
        self.positive_count = len(self.positive_prompts)
        self.botanical_negative_count = len(self.botanical_negative_prompts)

    def _ensure_model(self):
        if self.processor is not None and self.model is not None:
            return
        self.processor = CLIPProcessor.from_pretrained(self.model_name)
        self.model = CLIPModel.from_pretrained(self.model_name).to(self.device)
        self.model.eval()
        self._text_features = self._encode_text_prompts()

    def _load_image(self, image_bytes: bytes) -> Image.Image:
        return Image.open(io.BytesIO(image_bytes)).convert('RGB')

    def _encode_text_prompts(self):
        text_inputs = self.processor(
            text=self.candidate_prompts,
            return_tensors='pt',
            padding=True,
        )
        text_inputs = {key: value.to(self.device) for key, value in text_inputs.items()}
        with torch.no_grad():
            text_features = self.model.get_text_features(
                input_ids=text_inputs['input_ids'],
                attention_mask=text_inputs['attention_mask'],
            )
        text_features = text_features / text_features.norm(p=2, dim=-1, keepdim=True)
        return text_features

    def _build_views(self, image: Image.Image) -> List[Tuple[str, Image.Image]]:
        w, h = image.size
        views = [('full', image)]

        # Center crop removes noisy background/UI around edges.
        cx1, cy1 = int(w * 0.1), int(h * 0.1)
        cx2, cy2 = int(w * 0.9), int(h * 0.9)
        if cx2 > cx1 and cy2 > cy1:
            views.append(('center_80', image.crop((cx1, cy1, cx2, cy2))))

        # Vertical focus crop favors plant body in scan frames.
        fx1, fy1 = int(w * 0.08), int(h * 0.18)
        fx2, fy2 = int(w * 0.92), int(h * 0.92)
        if fx2 > fx1 and fy2 > fy1:
            views.append(('focus', image.crop((fx1, fy1, fx2, fy2))))

        return views

    def _similarities_for_view(self, image: Image.Image) -> List[float]:
        image_inputs = self.processor(images=image, return_tensors='pt')
        image_inputs = {key: value.to(self.device) for key, value in image_inputs.items()}
        with torch.no_grad():
            image_features = self.model.get_image_features(pixel_values=image_inputs['pixel_values'])
        image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
        similarities = (image_features @ self._text_features.T)[0]
        return similarities.detach().cpu().tolist()

    def _slice_scores(self, scores: List[float]):
        pos_end = self.positive_count
        bot_end = pos_end + self.botanical_negative_count
        positive_scores = scores[:pos_end]
        botanical_negative_scores = scores[pos_end:bot_end]
        nonplant_negative_scores = scores[bot_end:]
        return positive_scores, botanical_negative_scores, nonplant_negative_scores

    def _group_scores(self, view_scores: List[Dict]) -> Dict[str, float]:
        best_view = max(view_scores, key=lambda item: item['aloe_score'] - item['botanical_negative_score'])
        aloe_score = float(best_view['aloe_score'])
        botanical_negative_score = float(best_view['botanical_negative_score'])
        nonplant_negative_score = float(best_view['nonplant_negative_score'])
        non_aloe_score = max(botanical_negative_score, nonplant_negative_score)

        scores = best_view['scores']
        positive_scores, botanical_negative_scores, nonplant_negative_scores = self._slice_scores(scores)
        positive_pairs = list(zip(self.positive_prompts, positive_scores))
        negative_pairs = list(zip(self.botanical_negative_prompts + self.nonplant_negative_prompts, botanical_negative_scores + nonplant_negative_scores))
        top_positive = max(positive_pairs, key=lambda item: item[1]) if positive_pairs else ('', 0.0)
        top_negative = max(negative_pairs, key=lambda item: item[1]) if negative_pairs else ('', 0.0)

        prompt_scores = []
        for idx, prompt in enumerate(self.candidate_prompts):
            group = 'positive'
            if idx >= self.positive_count and idx < self.positive_count + self.botanical_negative_count:
                group = 'botanical_negative'
            elif idx >= self.positive_count + self.botanical_negative_count:
                group = 'nonplant_negative'
            prompt_scores.append({
                'prompt': prompt,
                'score': float(scores[idx]),
                'group': group,
            })
        prompt_scores.sort(key=lambda item: item['score'], reverse=True)

        return {
            'best_view': best_view['view'],
            'aloe_score': aloe_score,
            'botanical_negative_score': botanical_negative_score,
            'nonplant_negative_score': nonplant_negative_score,
            'non_aloe_score': float(non_aloe_score),
            'top_positive_prompt': top_positive[0],
            'top_positive_score': float(top_positive[1]),
            'top_negative_prompt': top_negative[0],
            'top_negative_score': float(top_negative[1]),
            'prompt_scores': prompt_scores,
        }

    def verify(self, image_bytes: bytes, threshold: float = None) -> Dict:
        if not image_bytes:
            return {
                'success': False,
                'error': 'Empty image payload',
                'is_aloe': False,
                'aloe_score': 0.0,
                'botanical_negative_score': 0.0,
                'non_aloe_score': 0.0,
                'threshold': self.threshold if threshold is None else float(threshold),
                'margin': self.margin,
                'botanical_tolerance': self.botanical_tolerance,
            }

        self._ensure_model()
        image = self._load_image(image_bytes)
        views = self._build_views(image)
        view_scores = []
        for view_name, view_img in views:
            sims = self._similarities_for_view(view_img)
            pos_scores, bot_neg_scores, nonplant_neg_scores = self._slice_scores(sims)
            view_scores.append({
                'view': view_name,
                'scores': sims,
                'aloe_score': max(pos_scores) if pos_scores else 0.0,
                'botanical_negative_score': max(bot_neg_scores) if bot_neg_scores else 0.0,
                'nonplant_negative_score': max(nonplant_neg_scores) if nonplant_neg_scores else 0.0,
            })

        active_threshold = self.threshold if threshold is None else float(threshold)
        passed_views = [
            item for item in view_scores
            if item['aloe_score'] >= active_threshold
            and (item['aloe_score'] + self.botanical_tolerance) >= item['botanical_negative_score']
        ]
        selected_views = passed_views if passed_views else view_scores
        grouped = self._group_scores(selected_views)
        aloe_score = grouped['aloe_score']
        botanical_negative_score = grouped['botanical_negative_score']
        non_aloe_score = grouped['non_aloe_score']
        is_aloe = len(passed_views) > 0

        return {
            'success': True,
            'is_aloe': bool(is_aloe),
            'aloe_score': aloe_score,
            'botanical_negative_score': botanical_negative_score,
            'non_aloe_score': non_aloe_score,
            'threshold': active_threshold,
            'margin': self.margin,
            'botanical_tolerance': self.botanical_tolerance,
            'model': self.model_name,
            'provider': 'local-transformers-clip',
            'best_view': grouped['best_view'],
            'passed_views': [item['view'] for item in passed_views],
            'top_positive_prompt': grouped['top_positive_prompt'],
            'top_positive_score': grouped['top_positive_score'],
            'top_negative_prompt': grouped['top_negative_prompt'],
            'top_negative_score': grouped['top_negative_score'],
            'prompt_scores': grouped['prompt_scores'],
        }
