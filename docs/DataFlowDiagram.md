# Data Flow Diagram

## Purpose

This document describes the system using Data Flow Diagram levels 1 to 3.

Scope:

- `Pamada` mobile app
- `backend` API server
- `ml-inference-service`
- MongoDB data stores represented by backend models

The diagrams are written in Mermaid so they can be rendered directly in Markdown viewers that support Mermaid.

## DFD notation used here

- External Entity: actor or external system interacting with the backend
- Process: transformation or business logic step
- Data Store: persisted collection or storage concept
- Data Flow: payload moving between entities, processes, and stores

## Level 1 DFD

Level 1 shows the major subsystems and the highest-level data movement.

```mermaid
flowchart LR
    U[User]
    A[Pamada Mobile App]
    B[Backend API Server]
    M[ML Inference Service]
    DB[(MongoDB)]
    C[Cloudinary / Media Storage]

    U -->|inputs, actions| A
    A -->|REST requests, auth token, socket events| B
    B -->|API responses, realtime events| A

    B -->|image verification and inference requests| M
    M -->|predictions, verification, maturity results| B

    B -->|read/write models| DB
    B -->|upload/delete image assets| C
    C -->|media URLs| B
```

## Level 1 explanation

At the highest level:

- the user interacts only with `Pamada`
- `Pamada` talks to `backend`
- `backend` is the only layer that reads or writes MongoDB
- `backend` also calls `ml-inference-service` during scan-related workflows
- media assets are uploaded through backend to Cloudinary-style storage and then referenced from database documents

## Level 2 DFD

<!-- [MermaidChart: 08037143-20f3-495e-8914-3595314e7539] -->
Level 2 breaks the backend into its main functional domains.

<!-- [MermaidChart: 08037143-20f3-495e-8914-3595314e7539] -->
```mermaid
flowchart TB
    U[User]
    A[Pamada]
    ML[ML Inference Service]
    MEDIA[Media Storage]

    P1[1.0 Auth and Profile Management]
    P2[2.0 Plant and Scan Management]
    P3[3.0 Recommendation and Care Plan]
    P4[4.0 Disease Reference and Analytics]
    P5[5.0 Community and Messaging]
    P6[6.0 Settings and Support]
    P7[7.0 Realtime Notification Gateway]

    D1[(User Store)]
    D2[(Plant Store)]
    D3[(Scan Store)]
    D4[(PlantScan Store)]
    D5[(Disease Store)]
    D6[(Recommendation Store)]
    D7[(RecommendationLog Store)]
    D8[(DiseaseKnowledge Store)]
    D9[(Analytics Store)]
    D10[(SupportTicket Store)]
    D11[(Community Stores)]
    D12[(Message Store)]
    D13[(MessageThreadPreference Store)]
    D14[(Notification Store)]

    U --> A

    A --> P1
    A --> P2
    A --> P3
    A --> P4
    A --> P5
    A --> P6
    A <--> P7

    P1 <--> D1

    P2 <--> D2
    P2 <--> D3
    P2 --> ML
    ML --> P2
    P2 <--> MEDIA

    P3 <--> D4
    P3 <--> D5
    P3 <--> D6
    P3 <--> D7
    P3 <--> D2
    P2 --> P3
    P3 --> P2

    P4 <--> D8
    P4 <--> D9
    P4 <--> D2
    P4 <--> D3

    P5 <--> D1
    P5 <--> D11
    P5 <--> D12
    P5 <--> D13
    P5 <--> D14
    P5 --> P7

    P6 <--> D1
    P6 <--> D10
    P6 <--> MEDIA

    P7 <--> D1
    P7 <--> D14
    P7 <--> D12
```

## Level 2 process descriptions

### `1.0 Auth and Profile Management`

Handles:

- registration
- login
- current user lookup
- profile updates
- password updates

Primary store:

- `User`

### `2.0 Plant and Scan Management`

Handles:

- plant creation and retrieval
- scan upload
- scan preview analysis
- scan confirmation
- live detection
- scan history retrieval

Primary stores:

- `Plant`
- `Scan`

External dependency:

- `ml-inference-service`

### `3.0 Recommendation and Care Plan`

Handles:

- disease key mapping
- structured recommendation generation
- care-plan persistence
- recommendation completion tracking

Primary stores:

- `PlantScan`
- `Disease`
- `Recommendation`
- `RecommendationLog`

### `4.0 Disease Reference and Analytics`

Handles:

- disease catalog retrieval
- disease treatment reference
- analytics summary
- weekly analytics

Primary stores:

- `DiseaseKnowledge`
- `Analytics`
- also reads `Plant` and `Scan`

### `5.0 Community and Messaging`

Handles:

- posts
- comments
- likes
- public profile viewing
- direct messages
- thread preferences
- notification creation from community events

Primary stores:

- `CommunityPost`
- `CommunityComment`
- `CommunityLike`
- `CommunityCommentLike`
- `Message`
- `MessageThreadPreference`
- `Notification`
- also reads `User`

### `6.0 Settings and Support`

Handles:

- account settings
- avatar and cover upload
- notification settings
- privacy settings
- support ticket creation and listing

Primary stores:

- `User`
- `SupportTicket`

### `7.0 Realtime Notification Gateway`

Handles:

- socket authentication
- message push
- typing indicators
- notification push
- community realtime events

Primary stores read for context:

- `User`
- `Notification`
- `Message`

## Level 3 DFD

Level 3 goes deeper into the most important operational flow: scanning, disease mapping, and recommendation generation.

```mermaid
flowchart TB
    U[User]
    A[Pamada Scan Screens]

    P21[2.1 Capture or Upload Scan Image]
    P22[2.2 Resolve User Plant Context]
    P23[2.3 Verify Aloe Image]
    P24[2.4 Run ML Prediction]
    P25[2.5 Generate Analysis Result]
    P26[2.6 Persist Raw Scan Record]
    P27[2.7 Map Disease Key]
    P28[2.8 Create PlantScan]
    P29[2.9 Load Preset Recommendations]
    P210[2.10 Create Recommendation Logs]
    P211[2.11 Return Scan and Care Plan Payload]
    P212[2.12 Update Recommendation Completion]

    ML1[ML Verify Endpoint]
    ML2[ML Predict Endpoint]

    D1[(Plant)]
    D2[(Scan)]
    D3[(Disease)]
    D4[(PlantScan)]
    D5[(Recommendation)]
    D6[(RecommendationLog)]
    D7[(Cloudinary / Media URLs)]

    U --> A
    A --> P21
    P21 --> P22

    P22 <--> D1
    P22 --> P23

    P23 --> ML1
    ML1 --> P23
    P23 -->|verified image| P24

    P24 --> ML2
    ML2 --> P24
    P24 --> P25

    P25 --> P26
    P26 <--> D7
    P26 <--> D2

    P26 --> P27
    P27 <--> D3
    P27 --> P28

    P28 <--> D4
    P28 --> P29

    P29 <--> D5
    P29 --> P210

    P210 <--> D6
    P210 --> P211
    D4 --> P211
    D5 --> P211
    D6 --> P211
    D2 --> P211
    P211 --> A

    A --> P212
    P212 <--> D6
    P212 <--> D4
    P212 <--> D1
    P212 --> A
```

## Level 3 explanation: scan and care plan flow

### `2.1 Capture or Upload Scan Image`

The user takes or selects an image in `Pamada`.

### `2.2 Resolve User Plant Context`

Backend finds the target plant by:

- provided plant ID
- existing latest plant
- or auto-created plant record if needed

### `2.3 Verify Aloe Image`

Backend sends the image to the aloe verification endpoint of `ml-inference-service`.

Output:

- is this image really Aloe Vera
- confidence and verification metadata

### `2.4 Run ML Prediction`

Backend sends the verified image to the prediction endpoint for:

- object detections
- visual features
- age estimation
- confidence score

### `2.5 Generate Analysis Result`

Backend transforms ML output into application-facing analysis:

- disease detected or not
- maturity stage
- health score
- estimated days to harvest
- recommendation hints

### `2.6 Persist Raw Scan Record`

Backend stores the scan and media references into `Scan`.

Stored data includes:

- image URLs
- YOLO predictions
- visual features
- analysis result
- scan metadata

### `2.7 Map Disease Key`

Backend normalizes the disease key and resolves it against the `Disease` store.

### `2.8 Create PlantScan`

Backend creates a structured `PlantScan` record tied to:

- user
- plant
- disease
- confidence
- severity
- legacy `Scan`

### `2.9 Load Preset Recommendations`

Backend reads `Recommendation` rows for the resolved disease.

### `2.10 Create Recommendation Logs`

Backend creates `RecommendationLog` rows so each recommendation has a per-scan completion state.

### `2.11 Return Scan and Care Plan Payload`

Backend returns:

- scan record
- disease
- confidence
- severity
- recommendation payload
- progress metadata

### `2.12 Update Recommendation Completion`

When the user marks an item complete:

- backend updates `RecommendationLog`
- backend recomputes care-plan completion on `PlantScan`
- backend may improve `Plant.current_status` when all required actions are complete

## Alternate Level 3 flow: community messaging

This is the second most important interactive flow in the system.

```mermaid
flowchart LR
    U1[Sender User]
    U2[Receiver User]
    A1[Pamada Sender App]
    A2[Pamada Receiver App]

    P51[5.1 Load Threads]
    P52[5.2 Load Messages]
    P53[5.3 Create Message]
    P54[5.4 Check Thread Preference]
    P55[5.5 Create Notification]
    P56[5.6 Emit Realtime Events]

    D1[(User)]
    D2[(Message)]
    D3[(MessageThreadPreference)]
    D4[(Notification)]

    U1 --> A1
    U2 --> A2

    A1 --> P51
    P51 <--> D2
    P51 <--> D3
    P51 <--> D1
    P51 --> A1

    A1 --> P52
    P52 <--> D2
    P52 <--> D1
    P52 --> A1

    A1 --> P53
    P53 <--> D2
    P53 --> P54

    P54 <--> D3
    P54 --> P55
    P54 --> P56

    P55 <--> D4
    P55 --> P56

    P56 --> A1
    P56 --> A2
```

## Alternate Level 3 flow: analytics summary

```mermaid
flowchart LR
    A[Pamada]
    P41[4.1 Request Summary]
    P42[4.2 Count Plants by Status]
    P43[4.3 Count User Scans]
    P44[4.4 Load Recent Scans]
    P45[4.5 Build Summary Payload]

    D1[(Plant)]
    D2[(Scan)]
    D3[(Analytics)]

    A --> P41
    P41 --> P42
    P41 --> P43
    P41 --> P44

    P42 <--> D1
    P43 <--> D2
    P44 <--> D2
    P41 -. optional weekly or daily analytics context .- D3

    P42 --> P45
    P43 --> P45
    P44 --> P45
    P45 --> A
```

## Data stores involved in the system

### Core stores

- `User`
- `Plant`
- `Scan`
- `PlantScan`
- `Disease`
- `Recommendation`
- `RecommendationLog`

### Reference and reporting stores

- `DiseaseKnowledge`
- `Analytics`

### Social and communication stores

- `CommunityPost`
- `CommunityComment`
- `CommunityLike`
- `CommunityCommentLike`
- `Message`
- `MessageThreadPreference`
- `Notification`

### Support store

- `SupportTicket`

## Summary

The shortest useful reading of the DFD is:

- `Pamada` is the only user-facing client
- `backend` is the orchestration layer
- `ml-inference-service` is a compute service, not a persistence layer
- MongoDB models are organized around identity, plant scanning, recommendations, community, analytics, and support
- the deepest operational path in the system is the scan-to-recommendation workflow

## Source alignment

This document aligns with:

- [docs/ModelUsage.md](/e:/MELVIN%20FOLDER/Aloe%20Vera/docs/ModelUsage.md)
- [docs/SchemaDiagram.md](/e:/MELVIN%20FOLDER/Aloe%20Vera/docs/SchemaDiagram.md)
- [backend/server.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/server.js)
- [backend/controllers/scanController.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/controllers/scanController.js)
- [backend/services/scanAnalysisService.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/services/scanAnalysisService.js)
- [backend/services/presetRecommendationService.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/services/presetRecommendationService.js)
- [backend/controllers/communityController.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/controllers/communityController.js)
- [backend/controllers/analyticsController.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/controllers/analyticsController.js)
- [Pamada/src/contexts/AppDataContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/AppDataContext.js)
- [Pamada/src/contexts/RealtimeContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/RealtimeContext.js)
- [ml-inference-service/app.py](/e:/MELVIN%20FOLDER/Aloe%20Vera/ml-inference-service/app.py)
