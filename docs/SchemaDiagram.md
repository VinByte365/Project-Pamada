# Document Schema Diagram

## Purpose

This document provides a schema-level view of the database models that are actively utilized by the current whole system:

- `backend`
- `Pamada`
- `ml-inference-service` through backend scan flows

This diagram is based on [docs/ModelUsage.md](/e:/MELVIN%20FOLDER/Aloe%20Vera/docs/ModelUsage.md) and focuses on document relationships, ownership, and the main references between collections.

## Mermaid ER Diagram

```mermaid
erDiagram
    USER {
        ObjectId _id
        string email
        string password_hash
        string full_name
        string role
        string phone
        boolean is_active
        date last_login
        object profile_image
        object cover_image
        object preferences
        date createdAt
        date updatedAt
    }

    PLANT {
        ObjectId _id
        string plant_id
        ObjectId owner_id
        date planting_date
        object location
        object current_status
        object metadata
        date createdAt
        date updatedAt
    }

    SCAN {
        ObjectId _id
        string scan_id
        number scan_number
        ObjectId plant_id
        ObjectId user_id
        ObjectId disease_id
        ObjectId plant_scan_id
        string disease_key
        object image_data
        array yolo_predictions
        object visual_features
        object analysis_result
        object recommendations
        object scan_metadata
        object self_learning_status
        date createdAt
        date updatedAt
    }

    PLANT_SCAN {
        ObjectId _id
        ObjectId user_id
        ObjectId plant_id
        ObjectId disease_id
        number confidence
        string severity
        date scanned_at
        ObjectId legacy_scan_id
        boolean care_plan_completed
        date care_plan_completed_at
        date createdAt
        date updatedAt
    }

    DISEASE {
        ObjectId _id
        string disease_key
        string display_name
        string description
        date createdAt
        date updatedAt
    }

    RECOMMENDATION {
        ObjectId _id
        ObjectId disease_id
        string recommendation_text
        string priority
        boolean is_required
        date createdAt
        date updatedAt
    }

    RECOMMENDATION_LOG {
        ObjectId _id
        ObjectId plant_scan_id
        ObjectId recommendation_id
        boolean completed
        date completed_at
        date createdAt
        date updatedAt
    }

    DISEASE_KNOWLEDGE {
        ObjectId _id
        string disease_name
        string display_name
        string description
        array symptoms
        array causes
        object severity_levels
        array preventive_measures
        number estimated_recovery_days
        array references
        date createdAt
        date updatedAt
    }

    ANALYTICS {
        ObjectId _id
        date date
        ObjectId user_id
        object metrics
        object model_performance
        object forecasting
        date createdAt
        date updatedAt
    }

    SUPPORT_TICKET {
        ObjectId _id
        string ticket_number
        ObjectId user_id
        string full_name
        string email
        string mobile_unit
        string os_version
        string issue_category
        string description
        object issue_image
        string status
        date createdAt
        date updatedAt
    }

    COMMUNITY_POST {
        ObjectId _id
        ObjectId user_id
        string content
        string media_url
        string media_type
        string media_public_id
        date createdAt
        date updatedAt
    }

    COMMUNITY_COMMENT {
        ObjectId _id
        ObjectId post_id
        ObjectId parent_comment_id
        ObjectId user_id
        string content
        date createdAt
        date updatedAt
    }

    COMMUNITY_LIKE {
        ObjectId _id
        ObjectId post_id
        ObjectId user_id
        date createdAt
        date updatedAt
    }

    COMMUNITY_COMMENT_LIKE {
        ObjectId _id
        ObjectId post_id
        ObjectId comment_id
        ObjectId user_id
        date createdAt
        date updatedAt
    }

    MESSAGE {
        ObjectId _id
        ObjectId sender_id
        ObjectId receiver_id
        string content
        boolean read_status
        array hidden_for
        date createdAt
        date updatedAt
    }

    MESSAGE_THREAD_PREFERENCE {
        ObjectId _id
        ObjectId user_id
        ObjectId counterpart_id
        boolean muted
        date createdAt
        date updatedAt
    }

    NOTIFICATION {
        ObjectId _id
        ObjectId user_id
        string type
        string reference_id
        string message
        boolean is_read
        date createdAt
        date updatedAt
    }

    USER ||--o{ PLANT : owns
    USER ||--o{ SCAN : creates
    PLANT ||--o{ SCAN : has

    USER ||--o{ PLANT_SCAN : initiates
    PLANT ||--o{ PLANT_SCAN : relates_to
    DISEASE ||--o{ PLANT_SCAN : classified_as
    SCAN o|--|| PLANT_SCAN : linked_to

    DISEASE ||--o{ RECOMMENDATION : defines
    PLANT_SCAN ||--o{ RECOMMENDATION_LOG : tracks
    RECOMMENDATION ||--o{ RECOMMENDATION_LOG : logged_as

    USER ||--o{ ANALYTICS : summarized_for
    USER ||--o{ SUPPORT_TICKET : submits

    USER ||--o{ COMMUNITY_POST : authors
    COMMUNITY_POST ||--o{ COMMUNITY_COMMENT : contains
    COMMUNITY_COMMENT ||--o{ COMMUNITY_COMMENT : replies_to
    USER ||--o{ COMMUNITY_COMMENT : writes

    USER ||--o{ COMMUNITY_LIKE : gives
    COMMUNITY_POST ||--o{ COMMUNITY_LIKE : receives

    USER ||--o{ COMMUNITY_COMMENT_LIKE : gives
    COMMUNITY_COMMENT ||--o{ COMMUNITY_COMMENT_LIKE : receives
    COMMUNITY_POST ||--o{ COMMUNITY_COMMENT_LIKE : scoped_to

    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives

    USER ||--o{ MESSAGE_THREAD_PREFERENCE : owns
    USER ||--o{ MESSAGE_THREAD_PREFERENCE : configures_for

    USER ||--o{ NOTIFICATION : receives
```

## Reading guide

### Identity and ownership

- `User` is the root identity document for most flows.
- `Plant`, `Scan`, `PlantScan`, `Analytics`, `SupportTicket`, `CommunityPost`, `CommunityComment`, `MessageThreadPreference`, and `Notification` all depend on `User`.

### Scan and recommendation flow

The scan subsystem is the most important chain in the system:

1. A `User` owns a `Plant`.
2. A `User` creates a `Scan` for that `Plant`.
3. Backend calls `ml-inference-service`.
4. ML results are persisted into `Scan`.
5. Backend maps the normalized disease key to `Disease`.
6. Backend creates a `PlantScan`.
7. Matching `Recommendation` rows are loaded.
8. Per-scan completion state is stored in `RecommendationLog`.

### Community flow

The community subsystem is built around:

- `CommunityPost`
- `CommunityComment`
- `CommunityLike`
- `CommunityCommentLike`
- `Message`
- `MessageThreadPreference`
- `Notification`

This supports:

- feed posts
- threaded comments and replies
- likes on posts and comments
- direct messages
- per-thread mute state
- real-time notification delivery

### Disease information flow

There are two disease-related collections with different responsibilities:

- `Disease`
  - normalized machine-facing disease key mapping for recommendations
- `DiseaseKnowledge`
  - long-form educational disease content shown in the app

These are intentionally separate and should not be merged conceptually.

## Collection notes

### `User`

- Root account and preference record
- Used by auth, settings, community, and socket auth

### `Plant`

- User-owned plant profile
- Stores current lifecycle and health snapshot

### `Scan`

- Raw scan history
- Main persistence target of backend + ML integration

### `PlantScan`

- Structured recommendation/care-plan record derived from a scan

### `Disease`

- Compact normalized disease mapping used by recommendation logic

### `Recommendation`

- Preset actions for a disease

### `RecommendationLog`

- Completion tracking for recommendation items per `PlantScan`

### `DiseaseKnowledge`

- Educational disease reference content

### `Analytics`

- Daily analytics snapshot storage

### `SupportTicket`

- User-submitted support issue records

### `CommunityPost`

- Social feed post document

### `CommunityComment`

- Comment and reply document

### `CommunityLike`

- User-to-post like join document

### `CommunityCommentLike`

- User-to-comment like join document

### `Message`

- Direct message document between two users

### `MessageThreadPreference`

- Directed per-user conversation settings, currently mute state

### `Notification`

- Persistent in-app notification record

## Practical diagram interpretation

If you want the most useful mental model:

- `User` is the root actor
- `Plant` is the root owned asset
- `Scan` is the raw detection history
- `PlantScan` is the actionable treatment state
- `Disease` and `Recommendation` are the treatment lookup layer
- `RecommendationLog` is progress tracking
- `DiseaseKnowledge` is the app's educational disease library
- community models are the social layer
- `Notification` connects activity back to the user

## Source alignment

This diagram is aligned with:

- [docs/ModelUsage.md](/e:/MELVIN%20FOLDER/Aloe%20Vera/docs/ModelUsage.md)
- [backend/models](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/models)
- [backend/server.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/backend/server.js)
- [Pamada/src/contexts/AppDataContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/AppDataContext.js)
- [Pamada/src/contexts/AuthContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/AuthContext.js)
- [Pamada/src/contexts/RealtimeContext.js](/e:/MELVIN%20FOLDER/Aloe%20Vera/Pamada/src/contexts/RealtimeContext.js)
- [ml-inference-service/app.py](/e:/MELVIN%20FOLDER/Aloe%20Vera/ml-inference-service/app.py)
