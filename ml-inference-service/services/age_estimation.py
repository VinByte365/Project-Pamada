class AgeEstimator:
    def estimate(self, visual_features, planting_date=None):
        try:
            color_index = visual_features.get('leaf_color_index', 0.5)
            pattern_score = visual_features.get('surface_pattern_score', 0.5)
            structure = visual_features.get('structural_features', {})
            thickness = structure.get('thickness_estimate', 'medium')
            leaf_count = structure.get('leaf_count_visible', 0)

            age_score = 0.0
            age_score += color_index * 0.3
            age_score += pattern_score * 0.2

            thickness_map = {'thin': 0.2, 'medium': 0.5, 'thick': 0.8}
            age_score += thickness_map.get(thickness, 0.5) * 0.3
            leaf_contribution = min(leaf_count / 10.0, 1.0) * 0.2
            age_score += leaf_contribution

            age_score = min(max(age_score, 0), 1)

            if age_score < 0.3:
                maturity = 'immature'
                estimated_months = 3 + (age_score * 6)
            elif age_score < 0.6:
                maturity = 'maturing'
                estimated_months = 9 + ((age_score - 0.3) * 10)
            elif age_score < 0.85:
                maturity = 'optimal'
                estimated_months = 12 + ((age_score - 0.6) * 8)
            else:
                maturity = 'over-mature'
                estimated_months = 14 + ((age_score - 0.85) * 6)

            if maturity == 'optimal':
                days_to_harvest = 0
            elif maturity == 'maturing':
                days_to_harvest = 30 + int((0.6 - age_score) * 60)
            elif maturity == 'immature':
                days_to_harvest = 60 + int((0.3 - age_score) * 90)
            else:
                days_to_harvest = -7

            return {
                'estimated_age_months': float(estimated_months),
                'maturity_assessment': maturity,
                'estimated_days_to_harvest': int(days_to_harvest),
                'age_confidence': float(age_score)
            }
        except Exception:
            return {
                'estimated_age_months': 6.0,
                'maturity_assessment': 'maturing',
                'estimated_days_to_harvest': 60,
                'age_confidence': 0.5
            }
