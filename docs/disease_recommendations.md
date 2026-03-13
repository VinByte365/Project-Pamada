# Disease Recommendation Actions

This guide lists the recommended actions per disease, aligned with the seeded disease knowledge data in the backend.

## Disease Nursery Prioritization Basis
The Disease Nursery “Priority” and task ordering are derived from backend recommendation logic:

- **Sort order:** Recommendations are sorted by `is_required` first, then by priority rank (`high`, `medium`, `low`).
- **Priority elevation:** If scan severity is `high`, the first two recommendations are elevated to `high` priority when they are not already `high`.
- **Low-confidence rule:** If scan confidence is below `0.65`, the first recommendation becomes **Required** and the text is augmented with a “verify with a clearer follow-up scan” note.
- **Displayed Priority:** The Disease Nursery screen shows overall priority using the **first recommendation’s priority** (the highest after sorting).
- **Severity and confidence sources:** Both come from the scan’s structured recommendation payload generated in `backend/services/presetRecommendationService.js`.

## Leaf Spot
**Description:** Fungal disease causing brown or black spots on leaves.

### Mild
- Remove affected leaves
- Improve air circulation
- Reduce watering frequency
- Apply fungicide spray

### Moderate
- Prune affected areas
- Apply systemic fungicide
- Improve drainage
- Monitor closely

### Severe
- Aggressive pruning
- Systemic fungicide treatment
- Isolate plant if possible
- Consider repotting with fresh soil

## Root Rot
**Description:** Fungal disease affecting roots, often fatal if not treated early.

### Mild
- Reduce watering immediately
- Improve soil drainage
- Apply fungicide to soil
- Repot with fresh, well-draining soil

### Moderate
- Remove affected roots
- Repot in fresh soil
- Apply systemic fungicide
- Reduce watering by 50%

### Severe
- Remove all affected roots
- Repot in sterile, well-draining medium
- Apply strong fungicide
- Consider propagation from healthy parts

## Sunburn
**Description:** Damage caused by excessive direct sunlight exposure.

### Mild
- Move to shaded area
- Remove severely damaged leaves
- Increase watering slightly
- Monitor recovery

### Moderate
- Provide shade immediately
- Prune damaged leaves
- Increase humidity
- Gradually reintroduce to light

### Severe
- Move to full shade
- Remove all damaged leaves
- Increase watering and humidity
- Wait for new growth before re-exposing

## Aloe Rust
**Description:** Fungal disease causing orange-brown pustules on leaves.

### Mild
- Remove affected leaves
- Improve air circulation
- Apply fungicide
- Reduce humidity

### Moderate
- Prune affected areas
- Apply systemic fungicide
- Isolate plant
- Improve growing conditions

### Severe
- Aggressive pruning
- Strong fungicide treatment
- Consider repotting
- Monitor closely for recovery

## Bacterial Soft Rot
**Description:** Bacterial disease causing soft, mushy tissue decay.

### Mild
- Remove affected tissue immediately
- Apply antibacterial treatment
- Improve drainage
- Reduce watering

### Moderate
- Surgical removal of affected parts
- Apply copper-based bactericide
- Repot if necessary
- Isolate plant

### Severe
- Remove all affected tissue
- Strong antibacterial treatment
- Consider propagation from healthy parts
- Dispose of severely affected plants

## Anthracnose
**Description:** Fungal disease causing dark, sunken lesions.

### Mild
- Remove affected leaves
- Improve air circulation
- Apply fungicide
- Reduce humidity

### Moderate
- Prune affected areas
- Apply systemic fungicide
- Improve growing conditions
- Monitor closely

### Severe
- Aggressive pruning
- Strong fungicide treatment
- Isolate plant
- Consider repotting

## Scale Insect
**Description:** Sap-sucking insects that attach to plant surfaces.

### Mild
- Manual removal with alcohol swab
- Apply insecticidal soap
- Increase plant vigor
- Monitor for reinfestation

### Moderate
- Apply horticultural oil
- Use systemic insecticide
- Prune heavily infested areas
- Improve plant care

### Severe
- Strong systemic insecticide
- Aggressive pruning
- Isolate plant
- Consider disposal if too severe

## Mealybug
**Description:** Small, white, cottony insects that feed on plant sap.

### Mild
- Manual removal
- Apply alcohol solution
- Use insecticidal soap
- Improve plant care

### Moderate
- Apply horticultural oil
- Use systemic insecticide
- Prune affected areas
- Increase monitoring

### Severe
- Strong systemic insecticide
- Aggressive treatment
- Isolate plant
- Consider disposal if necessary

## Spider Mite
**Description:** Tiny arachnids that cause stippling and webbing on leaves.

### Mild
- Increase humidity
- Spray with water
- Apply insecticidal soap
- Monitor closely

### Moderate
- Apply miticide
- Increase humidity
- Prune affected leaves
- Improve plant care

### Severe
- Strong miticide treatment
- Aggressive pruning
- Isolate plant
- Consider disposal if too severe

