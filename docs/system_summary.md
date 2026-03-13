# Pamada System Summary

## Purpose
Pamada is a full-stack Aloe Vera monitoring platform that combines mobile scanning, ML-driven plant health analysis, and analytics for farm management. The system supports image-based scan analysis, live imaging, plant library management, community interaction, and PDF analytics export.

## Architecture Overview
Pamada follows a client–server architecture with a dedicated ML inference service.

- Client: Expo/React Native mobile app
- API: Node.js/Express backend
- ML: Separate inference service accessed via backend
- Data: MongoDB for persistent storage
- Realtime: Socket.io for live updates (community, notifications, messages)

## Key System Components

### Mobile App (Expo/React Native)
- Scan capture and preview analysis
- Live imaging detection with bounding boxes
- Plant library and scan history
- Analytics dashboard and report export (PDF)
- Community feed, messaging, notifications
- Profile management and settings

### Backend API (Node.js/Express)
- Authentication and user profile management
- Plant, scan, and recommendation workflows
- Analytics aggregation endpoints
- Community posts, comments, and likes
- Messaging and notifications
- Media upload and optimization

### ML Inference Service
- Disease detection
- Maturity estimation
- Aloe verification gate
- Bounding box predictions for live imaging

## Core Data Models
- User: identity, preferences, and profile media
- Plant: library entity with current status and lifecycle
- Scan: raw scan record + ML analysis results
- PlantScan: structured care plan derived from scans
- Disease & DiseaseKnowledge: normalized keys and educational content
- Recommendation & RecommendationLog: care plan and completion tracking
- Analytics: daily summary storage
- Community + Messaging + Notification documents

## Major Workflows

### Scan & Analysis (Photo)
1. User captures an image in the app.
2. Backend verifies aloe presence.
3. ML service analyzes disease + maturity.
4. Scan record is saved; plant status updated.
5. Recommendations are generated and linked.

### Live Imaging
1. App captures frames on a short interval.
2. Backend runs live detection and returns bounding boxes.
3. UI overlays detections and confidence.

### Analytics
1. Backend aggregates plant library statuses (harvested, diseased, maturity).
2. Summary endpoint computes harvest rate, disease rate, and average maturity.
3. App displays metrics and can export a formatted PDF.

### Community & Messaging
1. Users create posts (caption-only or media-only).
2. Comments and likes update in realtime.
3. Messages and notifications are delivered over sockets.

## Current System Strengths
- End-to-end scan pipeline with ML integration.
- Live imaging with confidence thresholds and detection overlays.
- Analytics based on plant library status rather than raw scans.
- Clear modular separation between app, API, and ML service.
- Realtime updates for community and messaging features.

## Known Risks and Likely Panelist Targets

### 1. ML Reliability and False Outcomes
Risk: Low-confidence or missing values can produce “No plant detected” or misclassifications.
Mitigation:
- Enforce confidence thresholds and surface causes in UI.
- Add QA regression tests for model updates.

### 2. Data Consistency in Analytics
Risk: Analytics depend on plant status updates which can lag or fail.
Mitigation:
- Add scheduled reconciliation jobs from latest scans.
- Add admin tool to recompute library stats.

### 3. Live Imaging Performance
Risk: Latency and ML service failures cause empty bounding boxes.
Mitigation:
- Adaptive frame throttling.
- Cached last-known detections.
- Health checks with fallback UI.

### 4. Security & Data Privacy
Risk: Plant images and analytics are sensitive.
Mitigation:
- Enforce auth on all endpoints.
- Use signed URLs for media.
- Audit logs for access.

### 5. Community Moderation
Risk: Basic word filters are bypassable.
Mitigation:
- Add moderation workflows and reporting tools.
- Apply rate limits and content review.

### 6. Rate Limiting (Currently Disabled)
Risk: Abuse and ML cost spikes.
Mitigation:
- Re-enable limits in production via config.

## Recommendations
- Add production-grade rate limiting.
- Automate analytics reconciliation jobs.
- Add explicit ML confidence policy and monitoring.
- Improve live imaging resilience and fallback states.
- Strengthen moderation and audit logging.

