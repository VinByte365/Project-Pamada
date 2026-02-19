# Community Module Spec

## Stack
- Frontend: React Native (Expo), React Navigation, `socket.io-client`
- Backend: Node.js + Express, Socket.IO, JWT auth
- Database: MongoDB (Mongoose models)

## Database Schema

### Users
- `_id`
- `full_name`
- `email`
- `profile_image.url`
- `profile_image.public_id`
- `preferences.bio`
- `createdAt`

### CommunityPost
- `_id`
- `user_id` (ref `User`)
- `content`
- `media_url`
- `createdAt`
- `updatedAt`

### CommunityComment
- `_id`
- `post_id` (ref `CommunityPost`)
- `user_id` (ref `User`)
- `content`
- `createdAt`
- `updatedAt`

### CommunityLike
- `_id`
- `post_id` (ref `CommunityPost`)
- `user_id` (ref `User`)
- `createdAt`
- `updatedAt`
- Unique compound index: `{ post_id, user_id }`

### Message
- `_id`
- `sender_id` (ref `User`)
- `receiver_id` (ref `User`)
- `content`
- `read_status`
- `createdAt`
- `updatedAt`

### Notification
- `_id`
- `user_id` (ref `User`)
- `type` (`post_liked` | `post_commented` | `new_message` | `harvest_alert` | `health_alert` | `system_announcement`)
- `reference_id`
- `message`
- `is_read`
- `createdAt`
- `updatedAt`

## REST API

Base path: `/api/v1/community` (JWT protected)

### Posts
- `GET /posts`
- `POST /posts`
- `DELETE /posts/:postId` (owner only)
- `POST /posts/:postId/like`
- `POST /posts/:postId/comments`

### Profiles
- `GET /profiles/:userId`

### Messages
- `GET /messages/threads`
- `GET /messages/:userId`
- `POST /messages/:userId` (rate limited)

### Notifications
- `GET /notifications`
- `PUT /notifications/:notificationId/read`
- `PUT /notifications/read-all`
- `POST /notifications/system`

## Socket Event Structure

### Client -> Server
- `typing:start` `{ toUserId }`
- `typing:stop` `{ toUserId }`

### Server -> Client
- `socket:ready` `{ userId, connectedAt }`
- `community:post_created` `{ post }`
- `community:post_deleted` `{ postId }`
- `community:post_updated` `{ postId, likes_count, comments_count }`
- `community:comment_created` `{ comment }`
- `message:new` `{ id, sender_id, receiver_id, content, read_status, created_at }`
- `typing:start` `{ fromUserId, fromName, at }`
- `typing:stop` `{ fromUserId, at }`
- `notification:new` `{ id, type, reference_id, message, is_read, created_at }`

## Frontend Navigation
- New tab: `Community` in `MainTabs`
- New stack screens:
  - `Messages`
  - `PublicProfile`

## Global Notification UI
- Floating notification FAB mounted in app root
- Dropdown panel with read/unread state
- Real-time updates via Socket.IO
