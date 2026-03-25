# Pamada User Manual (High-Level)

## 1. Introduction
Pamada is a mobile support system for Aloe Vera growers. It combines AI scan analysis, care tracking, harvest guidance, and community features in one app.

This manual is designed for end users. It explains each major component, its purpose, and how the parts of the system work together in day-to-day use.

---

## 2. Authentication and Access
Authentication is the first step in using the system. It protects user data, keeps scan history linked to the correct account, and personalizes recommendations and notifications.

### 2.1 Register
**Purpose:** Create your personal account so your scans, analytics, and activity can be saved.

How to use:
- Open the app and tap **Register**.
- Enter full name, email, and password.
- Optional: add your phone number.
- Submit the form to finish account creation.

Expected result:
- Your account is created.
- You can now sign in and access the full app.

### 2.2 Login
**Purpose:** Securely access your account and continue your ongoing plant monitoring workflow.

How to use:
- Enter your email and password in the **Login** screen.
- Tap **Login**.
- Optional: enable **Remember Me** so your email remains pre-filled next time.

Expected result:
- You are redirected to the main app.
- Your dashboard and historical records become available.

### 2.3 Logout
**Purpose:** Safely end your active session, especially on shared devices.

How to use:
- Go to **Profile**.
- Tap **Logout**.

Expected result:
- Session ends and account access is closed until next login.

---

## 3. Main Navigation
After login, Pamada is organized into five primary tabs. Each tab has a focused role in the full crop-health cycle.

### 3.1 Home Tab
**Purpose:** Give a quick operational overview and provide shortcuts to high-frequency tasks.

What you can do:
- View summary cards related to current plant status.
- Check local weather to support care planning decisions.
- Open quick actions such as scanning or viewing history.
- Open the Aloe farms map and navigation options.
- Access message and notification entry points.

### 3.2 Library Tab
**Purpose:** Maintain an organized record of all scan results and support follow-up action tracking.

What you can do:
- View previous scans in one timeline.
- Apply status filters to prioritize urgent cases.
- Open each scan detail for diagnosis and progress data.
- Launch the correct next step, such as Disease Nursery or Harvest Guide.

### 3.3 Community Tab
**Purpose:** Support peer learning, collaboration, and experience sharing among growers.

What you can do:
- Read posts from other users.
- Share your own observations through text, image, or video posts.
- Participate in comments and replies.
- Track live interaction updates.

### 3.4 Chatbot Tab
**Purpose:** Provide fast Aloe-focused guidance without leaving the app.

What you can do:
- Ask about disease symptoms.
- Ask for care suggestions and practical treatment steps.
- Ask for harvesting advice and basic farm questions.

### 3.5 Profile Tab
**Purpose:** Manage your account identity, monitor overall performance, and configure system behavior.

What you can do:
- View personal and farm profile details.
- Track analytics summaries.
- Export reports.
- Open settings modules.
- Logout.

---

## 4. Core System Flow (Auth to Action)
The system is built around a continuous loop: login, scan, evaluate, apply action, and validate with rescans.

### 4.1 Step 1: Access the system
**Purpose:** Start your working session and restore your personalized context.

Workflow:
- Login through the authentication screen.
- Review the Home dashboard for immediate priorities.

### 4.2 Step 2: Run scan analysis
**Purpose:** Collect AI-based insights about plant health and maturity.

Workflow:
- Open scan options.
- Choose **Capture Image** or **Live Imaging**.
- Review output and confidence.
- Save valid scan results to history.

### 4.3 Step 3: Review and classify in Library
**Purpose:** Convert raw scan results into a manageable action list.

Workflow:
- Open Library.
- Filter by plant condition or status.
- Open scan details for urgency and care progress.

### 4.4 Step 4: Apply recommended action
**Purpose:** Ensure each diagnosis leads to practical field action.

Workflow:
- If risk/disease is detected, open **Disease Nursery** and follow checklist tasks.
- If harvest-ready, open **Harvest Guide** and follow harvesting instructions.

### 4.5 Step 5: Validate outcomes
**Purpose:** Confirm whether treatment or harvesting decisions were successful.

Workflow:
- Rescan plants after interventions.
- Compare new results with prior records.
- Continue cycle until status stabilizes or improves.

---

## 5. Scanning Components
Scanning is the main intelligence layer of the app. It converts plant images into actionable insights.

### 5.1 Scan Menu
**Purpose:** Let users choose the right analysis method based on context.

Options:
- **Capture Image** for controlled photo-based checks.
- **Live Imaging** for immediate on-camera detection.

### 5.2 Capture Image
**Purpose:** Provide precise and reviewable analysis for single images.

How it works for users:
- Take a photo or upload from gallery.
- The app checks whether the image is Aloe-related.
- Analysis output appears before save confirmation.

Typical output:
- Detected plant condition
- Maturity classification
- Confidence value
- Care recommendation summary

Best use case:
- Weekly monitoring and formal record-keeping.

### 5.3 Live Imaging
**Purpose:** Provide instant feedback when users need quick in-field screening.

How it works for users:
- Open Live Imaging mode.
- Point camera to Aloe leaves.
- View real-time labels and confidence overlays.

Best use case:
- Rapid scanning across multiple plants during inspection rounds.

### 5.4 Scan Result Confirmation
**Purpose:** Ensure only meaningful results are stored in history.

How to use:
- Review analysis preview.
- Confirm to save if result is acceptable.
- Rescan if confidence is low or image quality is poor.

---

## 6. Library and Follow-Up Components
Library and its linked modules turn detection results into consistent care execution.

### 6.1 Library (History)
**Purpose:** Central record system for tracking plant condition over time.

Key actions:
- Filter by status such as healthy, ready, harvested, or watchlist.
- Open each record for deeper details.
- Delete incorrect entries when necessary.

Practical value:
- Helps users avoid losing track of which plants were already checked or treated.

### 6.2 Scan Details
**Purpose:** Present full context behind each result so users can make better decisions.

Typical details shown:
- Condition and severity indicators
- Maturity level
- Confidence values
- Care progress status

Practical value:
- Reduces guesswork before deciding next action.

### 6.3 Disease Nursery
**Purpose:** Convert recommendations into an actionable checklist and monitor completion.

How to use:
- Open Disease Nursery from a scan needing intervention.
- Perform checklist tasks based on priority.
- Mark tasks completed as you finish them.
- Follow suggested rescan timing.

Practical value:
- Keeps treatment structured and traceable instead of informal.

### 6.4 Harvest Guide
**Purpose:** Support safe and timely harvesting for mature plants.

How to use:
- Open from ready-to-harvest records.
- Follow step-by-step instructions and reminders.
- Use video support when available.

Practical value:
- Improves consistency and reduces mistakes in harvest handling.

---

## 7. Communication and Collaboration Components
These features keep users connected with both system events and other growers.

### 7.1 Community Feed
**Purpose:** Build a shared knowledge space for practical Aloe farming experiences.

What users can do:
- Create text, image, or video posts.
- Like and comment on content.
- Reply to existing comments.
- Edit or remove their own contributions.

Practical value:
- Encourages peer-supported problem solving and continuous learning.

### 7.2 Messaging
**Purpose:** Enable direct one-to-one conversations inside the app.

What users can do:
- Browse message threads.
- Search users and start new chats.
- Track unread activity.
- Mute or hide threads if needed.

Practical value:
- Speeds up focused discussion compared with public comments.

### 7.3 Notifications
**Purpose:** Surface important events so users can respond quickly.

Typical notification sources:
- Community reactions and comments
- New messages
- Plant health alerts
- System reminders

What users can do:
- Mark notifications as read individually or in bulk.
- Tap notification entries to jump directly to relevant content.

Practical value:
- Prevents missed actions and improves response time.

---

## 8. Chatbot Component
The chatbot is designed as a fast assistant for Aloe-specific support.

### 8.1 Aloe AI Chatbot
**Purpose:** Provide immediate, context-relevant guidance for common Aloe concerns.

Recommended question types:
- Symptom interpretation and disease clues
- Care and treatment suggestions
- Harvest timing and handling advice
- General Aloe cultivation questions

Practical value:
- Helps users get quick direction without switching platforms or searching externally.

---

## 9. Profile, Reporting, and Settings Components
This area manages identity, preferences, and long-term performance tracking.

### 9.1 Profile Overview
**Purpose:** Show account and farm summary in one place.

What users can review:
- Personal profile details
- Farm context fields
- Quick access to settings and logout

### 9.2 Analytics
**Purpose:** Summarize progress and outcomes across all recorded scans.

Typical indicators:
- Harvest rate
- Disease rate
- Maturity trend data
- Distribution views for conditions

Practical value:
- Supports evidence-based decisions for planning and reporting.

### 9.3 PDF Report Export
**Purpose:** Create shareable documentation of current analytics.

How to use:
- Open Profile analytics.
- Export PDF report.
- Share with team members, supervisors, or records systems as needed.

### 9.4 Account Settings
**Purpose:** Keep user and farm information accurate over time.

Editable items include:
- Name, email, and phone
- Location and farm size
- Avatar and cover image

### 9.5 Notification Settings
**Purpose:** Control how and when app alerts are delivered.

Configurable controls include:
- Master notification toggle
- Push and email channel toggles
- Category-level alert preferences

### 9.6 Privacy and Security
**Purpose:** Protect account integrity and user consent choices.

Typical controls include:
- Password updates
- Privacy preference switches
- Security options where deployment supports them

### 9.7 Help and Support
**Purpose:** Provide official assistance channels for issues and questions.

Available support features:
- Contact information
- FAQ references
- Previous ticket status
- Issue report form with screenshot upload

---

## 10. Recommended Day-to-Day Usage Pattern
Use this routine to get reliable results and maintain clean records.

1. Login and review Home summary cards.
2. Run scans for priority plants.
3. Save valid scan results and review Library filters.
4. Execute Disease Nursery tasks for affected plants.
5. Use Harvest Guide for ready plants and mark harvested items.
6. Monitor notifications, messages, and community discussions.
7. Review Profile analytics weekly and export a PDF when needed.

---

## 11. Expected Benefits of Full-System Use
When all components are used together, Pamada helps users:
- Detect issues earlier through routine AI-assisted checks.
- Standardize treatment follow-up with checklist workflows.
- Improve harvest timing through maturity and readiness signals.
- Build stronger decisions through analytics and historical records.
- Learn faster through community exchange and chatbot support.
