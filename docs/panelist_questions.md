# Panelist Questions: ML & Scan Analysis (20)

1. What data sources and labeling process were used to train the disease and maturity models?
2. How do you verify that the model is detecting Aloe Vera specifically, not other plants with similar leaf textures?
3. What confidence threshold determines whether a scan is accepted or rejected, and why?
4. How do you handle “N/A” or missing confidence values from the ML service?
5. What are the top failure modes you’ve observed in live imaging vs. single-image scans?
6. How do you handle false positives where healthy plants are flagged as diseased?
7. How do you handle false negatives where diseased plants are marked healthy or “no plant detected”?
8. What preprocessing steps (resizing, compression, normalization) are applied before inference, and why?
9. How do you ensure bounding boxes align with the camera preview across devices and aspect ratios?
10. What is the latency target for live detection, and how do you enforce it?
11. How do you reconcile model outputs (disease key, severity, confidence) with business rules and UI display?
12. What safeguards exist if the ML service returns malformed or partial data?
13. How do you version models and keep scan results consistent across updates?
14. How do you validate model performance after each update (metrics, QA, regression tests)?
15. How do you handle edge cases like low light, occlusion, or multiple plants in a frame?
16. What logic determines “No plant detected” and how is it validated?
17. How do you update plant library status from scan outputs, and what prevents stale data?
18. How do you ensure that live imaging results are not cached incorrectly between frames?
19. What is your plan for continuous learning or retraining when new disease patterns appear?
20. How do you protect ML endpoints from abuse or high-cost usage spikes?

