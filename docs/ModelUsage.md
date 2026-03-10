# Whole-System Model Usage

## Scope

This document describes the backend database models that are actually utilized by the whole running system:

- `backend`: Express + MongoDB application layer
- `Pamada`: React Native client
- `ml-inference-service`: Flask inference service used by backend scan flows

The standard used here is practical end-to-end utilization:

- the model must participate in backend behavior
- that behavior must be exercised by `Pamada`, or by the backend's integration with `ml-inference-service`

Models that existed only for backend-only or admin-only flows with no current consumer in `Pamada` or `ml-inference-service` were removed. The training dataset flow fell into that category, so `TrainingDataset` and `/api/v1/training` are no longer part of the active system surface.

## How the system is wired

### Data path

1. `Pamada` calls backend REST endpoints and opens a Socket.IO connection.
2. Backend reads and writes MongoDB through Mongoose models.
3. For scan analysis and aloe verification, backend calls `ml-inference-service`.
4. Backend stores the returned ML output into scan-related models and returns app-ready payloads back to `Pamada`.

### Important implication

`ml-inference-service` does not talk to MongoDB directly. It has no database models of its own. Its contribution to model usage is indirect: it powers backend scan flows that persist to models like `Scan`, `PlantScan`, `Disease`, `Recommendation`, and `RecommendationLog`.

## Active whole-system models

- `User`
- `Plant`
- `Scan`
- `PlantScan`
- `Disease`
- `Recommendation`
- `RecommendationLog`
- `DiseaseKnowledge`
- `Analytics`
- `SupportTicket`
- `CommunityPost`
- `CommunityComment`
- `CommunityLike`
- `CommunityCommentLike`
- `Message`
- `MessageThreadPreference`
- `Notification`

## Removed from whole-system scope

- `TrainingDataset`

Reason:

- it was only used by backend admin endpoints under `/api/v1/training`
- there is no `Pamada` consumer for those endpoints
- `ml-inference-service` does not read or write that model

## End-to-end route surface that drives model usage

The app currently exercises these backend areas:

- `/api/v1/auth`
- `/api/v1/plants`
- `/api/v1/scans`
- `/api/v1/diseases`
- `/api/v1/analytics/summary`
- `/api/v1/analytics/weekly`
- `/api/v1/settings/account`
- `/api/v1/settings/notifications`
- `/api/v1/settings/privacy`
- `/api/v1/settings/help`
- `/api/v1/settings/philippines-farms`
- `/api/v1/settings/home-hero-media`
- `/api/v1/community/posts`
- `/api/v1/community/profiles/:userId`
- `/api/v1/community/messages/*`
- `/api/v1/community/notifications/*`
- `/api/chatbot/ask`

The ML service is exercised by backend scan flows through:

- `POST /verify/aloe`
- `POST /predict`
- `POST /predict/maturity`

## Relationship map

- A `User` owns many `Plant` records.
- A `User` creates many `Scan` records.
- A `Plant` has many `Scan` records.
- A `Scan` can link to one `PlantScan`.
- A `PlantScan` points to one `Disease`.
- A `Disease` has many `Recommendation` rows.
- A `PlantScan` has many `RecommendationLog` rows.
- A `CommunityPost` belongs to one `User`.
- A `CommunityComment` belongs to one `CommunityPost` and one `User`.
- A `CommunityLike` joins `User` to `CommunityPost`.
- A `CommunityCommentLike` joins `User` to `CommunityComment`.
- A `Message` joins sender and receiver `User` records.
- A `MessageThreadPreference` stores directed mute state between two users.
- A `Notification` belongs to one `User`.
- An `Analytics` row belongs to one `User` and summarizes scan activity for a date.
- A `SupportTicket` belongs to one `User`.

## Model-by-model usage

## `User`

### Purpose

Identity, authentication, profile data, user preferences, account status, and socket authentication.

### Used by backend

- `backend/controllers/userController.js`
- `backend/controllers/settingsController.js`
- `backend/controllers/communityController.js`
- `backend/socket.js`

### Reached by Pamada

- login, register, and current-user hydration via `AuthContext`
- account settings screens
- privacy and notification settings screens
- messaging screens
- public profile screens
- real-time socket connection

### Whole-system role

Without `User`, the mobile app cannot authenticate, cannot own plants, cannot send messages, cannot receive notifications, and cannot open authenticated sockets.

## `Plant`

### Purpose

Owned Aloe Vera plant record and current plant state snapshot.

### Used by backend

- `backend/controllers/plantController.js`
- `backend/controllers/scanController.js`
- `backend/controllers/analyticsController.js`
- `backend/services/presetRecommendationService.js`

### Reached by Pamada

- auto-create or fetch current plant in `AppDataContext`
- mark plant harvested
- fetch plant-linked scan data indirectly through scan APIs

### Whole-system role

`Pamada` assumes there is a plant context for scans. The scan flow resolves or auto-creates a `Plant`, then links future scans and harvest state to it.

## `Scan`

### Purpose

Primary historical record of scan uploads, image metadata, ML predictions, and analysis results.

### Used by backend

- `backend/controllers/scanController.js`
- `backend/services/scanAnalysisService.js`
- `backend/controllers/analyticsController.js`
- `backend/models/analytics.js`

### Reached by Pamada

- create scan
- analyze preview
- confirm preview
- live detect
- fetch recent scans
- fetch a specific scan
- delete a scan
- show scan summaries in home, history, capture, and profile views

### Reached through ml-inference-service

Backend scan flows call the ML service and persist the returned detection output into `Scan`.

### Whole-system role

This is the central persistence layer for the scanning feature. It is one of the clearest examples of full-system utilization because all three layers participate in it.

## `PlantScan`

### Purpose

Normalized care-plan record derived from a scan after disease-key mapping.

### Used by backend

- `backend/controllers/scanController.js`
- `backend/services/presetRecommendationService.js`

### Reached by Pamada

- recommendation payload retrieval for a scan
- recommendation completion toggling
- structured disease/severity/care-plan display after preview confirm

### Whole-system role

`PlantScan` is the bridge between raw scan history and action-oriented treatment workflow. The app does not create it directly, but it consumes the behavior built on top of it.

## `Disease`

### Purpose

Compact disease mapping table for normalized machine disease keys.

### Used by backend

- `backend/services/presetRecommendationService.js`
- `backend/controllers/scanController.js`
- `backend/seeders/presetRecommendationSeeder.js`

### Reached by Pamada

Indirectly through scan recommendation payloads. When the app asks for scan recommendations or confirms a preview, backend resolves a `Disease` record first.

### Whole-system role

This model is necessary for turning ML output into stable recommendation groups. It is not a content model; it is a mapping model.

## `Recommendation`

### Purpose

Preset care actions linked to a disease.

### Used by backend

- `backend/services/presetRecommendationService.js`
- `backend/controllers/scanController.js`
- `backend/seeders/presetRecommendationSeeder.js`

### Reached by Pamada

- preview recommendation display
- scan recommendation display
- recommendation completion UI

### Whole-system role

This model supplies the actual action list the user sees after scan analysis.

## `RecommendationLog`

### Purpose

Per-`PlantScan` execution state for preset recommendations.

### Used by backend

- `backend/services/presetRecommendationService.js`

### Reached by Pamada

- completion status is returned when fetching recommendations
- completion state changes when the app marks a recommendation complete or incomplete

### Whole-system role

`Recommendation` defines the plan; `RecommendationLog` stores user progress on that plan.

## `DiseaseKnowledge`

### Purpose

Long-form disease reference content for the disease nursery.

### Used by backend

- `backend/controllers/diseaseController.js`
- `backend/seeders/diseaseSeeder.js`

### Reached by Pamada

- disease catalog fetch in `AppDataContext`
- disease nursery screen and related reference views

### Whole-system role

This is the content source for app-side disease education. It is separate from machine disease mapping.

## `Analytics`

### Purpose

Stored daily analytics snapshots and source data for weekly analytics responses.

### Used by backend

- `backend/controllers/analyticsController.js`
- `backend/models/analytics.js`

### Reached by Pamada

- `AppDataContext` calls `/api/v1/analytics/summary`
- `AppDataContext` calls `/api/v1/analytics/weekly`
- profile and home surfaces render metrics built from those responses

### Whole-system role

Although `Pamada` does not call every analytics endpoint, it does consume analytics-backed summary and weekly metrics, so `Analytics` remains part of the active whole-system surface.

## `SupportTicket`

### Purpose

Persisted user support and issue reports.

### Used by backend

- `backend/controllers/settingsController.js`

### Reached by Pamada

- help and support screen
- report issue screen

### Whole-system role

The app both reads support history and creates new support tickets, so this model is directly exercised end to end.

## `CommunityPost`

### Purpose

Community feed post record.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- community feed listing
- create post
- delete post
- public profile post listing

### Whole-system role

Core model for the app's social feed.

## `CommunityComment`

### Purpose

Comments and replies on community posts.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- create comment
- reply to comment
- edit comment
- delete comment
- render nested discussion threads

### Whole-system role

This model powers the discussion layer on top of community posts.

## `CommunityLike`

### Purpose

User-to-post like join record.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- like and unlike posts
- list likes for a post
- render post like state and counts

### Whole-system role

This model is active because the app explicitly toggles and displays post likes.

## `CommunityCommentLike`

### Purpose

User-to-comment like join record.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- like and unlike comments
- render comment like counts
- list users who liked a comment

### Whole-system role

This is the comment-level counterpart of `CommunityLike`.

## `Message`

### Purpose

Direct message record between two users.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- thread list
- conversation screen
- send message
- delete thread for one side

### Whole-system role

This model is part of both REST and real-time messaging flow.

## `MessageThreadPreference`

### Purpose

Per-user thread settings for direct messages. Current active field: `muted`.

### Used by backend

- `backend/controllers/communityController.js`

### Reached by Pamada

- mute and unmute conversation
- thread list mute state

### Whole-system role

This model is directly exercised by the messages screen and affects notification behavior.

## `Notification`

### Purpose

Persisted in-app notification record.

### Used by backend

- `backend/controllers/userController.js`
- `backend/controllers/communityController.js`

### Reached by Pamada

- notification FAB
- notification list refresh
- mark one read
- mark all read
- real-time `notification:new` socket handling

### Whole-system role

This model is used both as stored state and as the payload source for real-time notification events.

## Why `TrainingDataset` was removed

`TrainingDataset` supported these backend-only functions:

- pending dataset validation
- validation and rejection workflows
- training batch export
- auto-flagging low-confidence samples
- training statistics

Those features were mounted only under `/api/v1/training`, and there is currently:

- no `Pamada` screen, context, or service calling those endpoints
- no `ml-inference-service` read/write path for that dataset

Because the request was to keep only models utilized by the whole system, that model and its route/controller wiring were removed.

## Design notes

### `Scan` vs `PlantScan`

- `Scan` stores raw scan history and ML output.
- `PlantScan` stores normalized disease/care-plan state built from the scan.

Both remain because the app depends on both behaviors, even if it only sees `PlantScan` indirectly through recommendation payloads.

### `Disease` vs `DiseaseKnowledge`

- `Disease` is machine-oriented and powers recommendation mapping.
- `DiseaseKnowledge` is content-oriented and powers disease reference screens.

They are both active because the app uses both product surfaces.

### Community models remain fully active

The community feed, comments, likes, messaging, thread mute state, and notifications are all exercised by current `Pamada` screens and Socket.IO listeners. None of those models are backend-only.

## File references

Primary backend route mounting: [backend/server.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/server.js)

Mobile API entry points:

- [Pamada/src/contexts/AuthContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/AuthContext.js)
- [Pamada/src/contexts/AppDataContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/AppDataContext.js)
- [Pamada/src/contexts/RealtimeContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/RealtimeContext.js)
- [Pamada/src/screens/CommunityScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/CommunityScreen.js)
- [Pamada/src/screens/ConversationScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/ConversationScreen.js)
- [Pamada/src/screens/MessagesScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/MessagesScreen.js)
- [Pamada/src/screens/AccountSettingsScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/AccountSettingsScreen.js)
- [Pamada/src/screens/NotificationsScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/NotificationsScreen.js)
- [Pamada/src/screens/PrivacySecurityScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/PrivacySecurityScreen.js)
- [Pamada/src/screens/HelpSupportScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/HelpSupportScreen.js)
- [Pamada/src/screens/ReportIssueScreen.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/screens/ReportIssueScreen.js)

ML service entry points:

- [ml-inference-service/app.py](/e:/MELVIN%20FOLDER/Aloe%20Vera/ml-inference-service/app.py)
- [backend/services/mlService.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/services/mlService.js)
- [backend/services/aloeVerificationService.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/services/aloeVerificationService.js)
- [backend/services/scanAnalysisService.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/services/scanAnalysisService.js)
