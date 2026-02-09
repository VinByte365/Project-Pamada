import numpy as np

class AgeEstimator:
    def __init__(self):
        """
        Initialize age estimation model
        Note: This is a placeholder. In production, this should use
        a trained model based on visual features and planting date.
        """
        pass
    
    def estimate(self, visual_features, planting_date=None):
        """
        Estimate plant age based on visual features
        
        Args:
            visual_features: Dictionary of visual features
            planting_date: Optional planting date for more accurate estimation
        
        Returns:
            Dictionary with age estimation results
        """
        try:
            # Extract features
            color_index = visual_features.get('leaf_color_index', 0.5)
            pattern_score = visual_features.get('surface_pattern_score', 0.5)
            structure = visual_features.get('structural_features', {})
            thickness = structure.get('thickness_estimate', 'medium')
            leaf_count = structure.get('leaf_count_visible', 0)
            
            # Simple heuristic-based age estimation
            # In production, this should use a trained regression model
            
            # Base age factors
            age_score = 0.0
            
            # Color index contribution (higher green = older/more mature)
            age_score += color_index * 0.3
            
            # Pattern score contribution (more texture = older)
            age_score += pattern_score * 0.2
            
            # Thickness contribution
            thickness_map = {'thin': 0.2, 'medium': 0.5, 'thick': 0.8}
            age_score += thickness_map.get(thickness, 0.5) * 0.3
            
            # Leaf count contribution (normalized)
            leaf_contribution = min(leaf_count / 10.0, 1.0) * 0.2
            age_score += leaf_contribution
            
            # Normalize age score
            age_score = min(max(age_score, 0), 1)
            
            # Map to maturity assessment
            if age_score < 0.3:
                maturity = 'immature'
                estimated_months = 3 + (age_score * 6)  # 3-9 months
            elif age_score < 0.6:
                maturity = 'maturing'
                estimated_months = 9 + ((age_score - 0.3) * 10)  # 9-12 months
            elif age_score < 0.85:
                maturity = 'optimal'
                estimated_months = 12 + ((age_score - 0.6) * 8)  # 12-14 months
            else:
                maturity = 'over-mature'
                estimated_months = 14 + ((age_score - 0.85) * 6)  # 14-16 months
            
            # Estimate days to harvest based on maturity
            if maturity == 'optimal':
                days_to_harvest = 0  # Ready now
            elif maturity == 'maturing':
                days_to_harvest = 30 + int((0.6 - age_score) * 60)  # 0-30 days
            elif maturity == 'immature':
                days_to_harvest = 60 + int((0.3 - age_score) * 90)  # 60-150 days
            else:  # over-mature
                days_to_harvest = -7  # Overdue
            
            return {
                'estimated_age_months': float(estimated_months),
                'maturity_assessment': maturity,
                'estimated_days_to_harvest': int(days_to_harvest),
                'age_confidence': float(age_score)
            }
            
        except Exception as e:
            print(f"Error in age estimation: {str(e)}")
            return {
                'estimated_age_months': 6.0,
                'maturity_assessment': 'maturing',
                'estimated_days_to_harvest': 60,
                'age_confidence': 0.5
            }

