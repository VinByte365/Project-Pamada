# Detectable Diseases

This system now preserves each model label as its own `disease_key` so the API can surface distinct conditions. The mappings are defined in `backend/services/scanAnalysisService.js`, with display names and recommendations in `backend/seeders/presetRecommendationSeeder.js`.

## Disease Outputs

| Output `disease_key` | Display name | Mapped model labels |
| --- | --- | --- |
| `leaf_spot` | Leaf Spot | `leaf_spot` |
| `root_rot` | Root Rot | `root_rot` |
| `sunburn` | Sunburn | `sunburn` |
| `aloe_rust` | Aloe Rust | `aloe_rust` |
| `bacterial_soft_rot` | Bacterial Soft Rot | `bacterial_soft_rot` |
| `anthracnose` | Anthracnose | `anthracnose` |
| `scale_insect` | Scale Insect | `scale_insect` |
| `mealybug` | Mealybug | `mealybug` |
| `spider_mite` | Spider Mite | `spider_mite` |

## Non-disease Outcomes

These are returned by the classifier but are not diseases.

| Output `disease_key` | Display name | Mapped model labels |
| --- | --- | --- |
| `healthy` | Healthy Condition | `healthy` |
| `unknown_condition` | Unclassified Condition | any unmapped label |

## Legacy Compatibility

Older clients may still send grouped labels. These are normalized to the nearest current key.

| Legacy label | Normalized `disease_key` |
| --- | --- |
| `fungal_infection` | `leaf_spot` |
| `bacterial_spot` | `bacterial_soft_rot` |
