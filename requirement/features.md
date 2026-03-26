# Planora – Complete Feature Specification

Here's the fully fleshed-out, industry-grade feature list organized by role and module.

---

## 🔐 Authentication & Authorization

### All Users

- Register with name, email, password, profile photo (optional), and bio
- Email verification on signup (verification link sent via email)
- Login with email + password
- JWT access token (short-lived, 15min) + refresh token (long-lived, 7d) strategy
- Auto token refresh via HTTP-only cookie
- Logout (invalidates refresh token server-side)
- Forgot password → email reset link
- Reset password via secure token
- Google OAuth (optional but recommended for industry grade)
- Rate limiting on auth endpoints (prevent brute force)
- Account lockout after N failed login attempts

---

## 👑 Admin Role — Full Feature List

### Dashboard Overview

- Summary cards: Total Users, Total Events, Pending Reports, Revenue (total platform fees if applicable)
- Line chart: New registrations over time
- Bar chart: Events by category (Public Free, Public Paid, Private Free, Private Paid)
- Recent activity feed (latest joins, new events, new users)

### User Management

- View all registered users (paginated, searchable by name/email)
- View individual user profile (bio, events created, events joined, reviews written)
- Activate / Deactivate user accounts (soft ban — user can't login)
- Permanently delete user accounts (with cascading cleanup: events, reviews, participations)
- Promote user to Admin role
- Demote Admin back to User
- Filter users by: status (active/banned), role, join date

### Event Moderation

- View all events (Public + Private) with full details
- Search events by title, organizer, category, date range
- Feature an event on the homepage Hero Section (only one at a time)
- Unfeature a currently featured event
- Delete any inappropriate/spam event (with optional reason logged)
- View event participation list for any event
- View payment records linked to any event

### Review Moderation

- View all reviews across the platform
- Delete any inappropriate or abusive review
- Flag system: users can flag reviews → Admin sees flagged reviews queue

### Reports & Analytics

- Export user list as CSV
- Export event list as CSV
- Revenue report: total fees collected (filterable by date range)
- Top events by participant count
- Top organizers by event count

### Platform Settings (optional stretch goal)

- Set platform name, logo (branding)
- Toggle maintenance mode
- Configure featured event slot

### Notifications (Admin)

- In-app notification when a new user registers
- In-app notification when an event is reported/flagged
- Email digest (daily/weekly summary)

---

## 👤 User Role — Full Feature List

### Profile & Settings

- View own profile page (public-facing: name, bio, photo, events organized, reviews)
- Edit profile: name, bio, profile photo upload (stored via Cloudinary or S3)
- Change password (requires current password confirmation)

### Event Discovery

- Browse all Public events (paginated)
- Filter by: Public Free, Public Paid, Private Free, Private Paid
- Sort by: Date (soonest first), Newest, Most Popular (by participant count)
- Search by: Title, Organizer name
- View event details page (full info)
- See "similar events" section on event detail page (same category)
- Bookmark / Save events to a personal watchlist

### Event Participation

Event Type

Flow

**Public Free**

Click Join → Instantly confirmed

**Public Paid**

Click Pay & Join → Stripe/SSLCommerz checkout → On payment success → Confirmed

**Private Free**

Click Request to Join → Status: Pending → Host approves/rejects

**Private Paid**

Click Pay & Request → Payment → Status: Pending → Host approves/rejects

- View own participation status on event detail (Pending / Confirmed / Rejected / Banned)
- Cancel own participation (if event hasn't started, refund policy applies)
- Receive email/in-app notification on status change

### Invitations

- Receive invitations from event hosts
- View all invitations in Dashboard → Pending Invitations
- Accept invitation (Free event → instantly confirmed)
- Pay & Accept (Paid event → checkout → confirmed)
- Decline invitation
- Invitation expiry (auto-decline after event date passes)

### Event Creation & Management

#### Create Event

- Title (required, max 100 chars)
- Description (rich text editor — bold, italic, bullet list, links)
- Date (required)
- Time (required, with timezone selector)
- Venue name + address OR Online event link
- Event banner image upload
- Category tag (Conference, Workshop, Meetup, Party, Webinar, etc.)
- Public / Private toggle
- Registration fee (0 = Free, >0 = Paid) with currency selector
- Max participants limit (optional)
- Event tags (searchable keywords)
- Deadline for registration

#### Update Event

- Edit all fields above
- Cannot change fee type (Free→Paid) after participants have joined (guard rail)
- Publish event update notification to all confirmed participants

#### Delete Event

- Soft delete with confirmation modal
- Trigger refund workflow for all paid participants
- Notify all participants via email

#### Participant Management (as Host)

- View full participant list with: name, photo, join date, payment status, approval status
- Approve pending join requests (one by one or bulk approve)
- Reject pending join requests (with optional reason message)
- Ban a confirmed participant (removes them, blocks re-joining this event)
- Unban a participant
- Export participant list as CSV
- Search participants by name/email

#### Invitation System (as Host)

- Search registered users by name/email to invite
- Send invitations (max 50 per event to prevent spam)
- View sent invitations and their status (Pending / Accepted / Declined)
- Revoke a pending invitation
- Resend invitation reminder

### Reviews & Ratings

- Write a review only after joining AND after event date has passed
- Star rating: 1–5 stars (required)
- Written review text (optional, max 500 chars)
- Edit own review (within 7 days of posting)
- Delete own review (within 7 days of posting)
- View all reviews on the event detail page (paginated, newest first)
- Average rating displayed prominently on event card and detail page
- Flag another user's review as inappropriate

### Dashboard Sidebar Sections

#### My Events (as Organizer)

- List of events I created (with status: Draft / Active / Ended)
- Quick stats per event: participant count, pending requests, revenue earned
- Create new event button

#### My Joined Events (as Participant)

- List of events I've joined / requested to join
- Status badge: Confirmed / Pending / Rejected / Banned
- Cancel participation button (if eligible)

#### Pending Invitations

- List of invitations with event details, host name, fee
- Accept / Decline / Pay & Accept actions

#### My Reviews

- List of reviews I've written with the event name and rating
- Edit / Delete options (within allowed period)

#### My Bookmarks

- Saved/bookmarked events
- Remove from bookmarks

#### Settings

- Profile settings
- Notification preferences
- Change password
- Danger zone: Delete account

---

## 💳 Payment System

- Stripe (international) and/or SSLCommerz/ShurjoPay (Bangladesh) integration
- Payment record stored in DB: userId, eventId, amount, currency, status, transactionId, timestamp
- Payment status: Pending / Completed / Failed / Refunded
- On successful payment:
  - Participation record created with status "Confirmed" (Public Paid) or "Pending" (Private Paid)
  - Confirmation email with receipt sent to user
- On failed payment:
  - User notified, participation not created
  - Retry payment option available
- Refund workflow (triggered on event deletion or host rejection):
  - Refund initiated via payment gateway API
  - Record updated to "Refunded"
  - User notified via email

---

### Email Notifications

- Welcome email on registration
- Email verification link
- Password reset link
- Event confirmation email (with event details)
- Payment receipt
- Join request status update
- Invitation email
- Event update notice

---

## 🛡️ Security & Error Handling

- JWT access + refresh token rotation
- HTTP-only cookies for refresh tokens
- CORS configured for frontend origin only
- Helmet.js for HTTP security headers
- Input sanitization (prevent XSS)
- SQL injection protection via Prisma parameterized queries
- Rate limiting on all sensitive endpoints
- File upload validation (type, size limits)
- Role-based middleware guards on every protected route
- Global error handler with structured error responses
- Validation errors: field-level messages returned from server
- Unauthorized / Forbidden responses with clear messages
- 404 handler for unknown routes

---
