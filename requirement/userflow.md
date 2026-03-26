
# Planora — Complete Platform Flow A to Z

----------

## 🌐 Public User (Not Logged In)

### Lands on Homepage

-   Sees the **Hero Section** with the Admin-featured event (title, date, description, join button)
-   Sees the **Upcoming Events Slider** (9 upcoming public events)
-   Browses **Event Categories** (Public Free, Public Paid, Private Free, Private Paid)
-   Sees **Call to Action** — encouraged to create or join events
-   Clicks **Login / Signup** from navbar

### Browses Events Page

-   Sees all public events (paginated)
-   Can search by title or organizer name
-   Can filter by category and sort by date, newest, popularity
-   Clicks **View Details** on any event card

### On Event Detail Page

-   Sees full event info (title, date/time, venue/link, description, organizer, fee, average rating)
-   Sees all reviews and ratings from past attendees
-   Sees similar events section
-   Clicks **Join / Pay & Join / Request** → gets redirected to **Login**

----------

## 🔐 Authentication Flow

### Registration

1.  User fills in name, email, password, optional photo
2.  Account created → **verification email sent**
3.  User clicks link in email → email verified → account active
4.  Redirected to login

### Login

1.  User submits email + password
2.  Server validates credentials
3.  Issues **JWT access token** (short-lived) + **refresh token** (HTTP-only cookie)
4.  Redirected to Dashboard

### Token Lifecycle

-   Every request sends the access token in the Authorization header
-   When access token expires, the client uses the refresh token to silently get a new one
-   On logout, refresh token is invalidated server-side

### Forgot Password

1.  User submits email → reset link sent
2.  Clicks link → lands on reset password page
3.  Submits new password → token invalidated → redirected to login

----------

## 👤 User Flow — Full Journey

### Step 1 — Profile Setup

-   After login, user can update their profile (name, bio, photo)
-   Sets notification preferences (which emails they want)
-   Profile page is public-facing — shows events they organized and reviews written

----------

### Step 2 — Discovering Events

User goes to **Events Page** or **Homepage**:

-   Browses, searches, filters public events
-   Clicks into an **Event Detail Page**
-   Can bookmark the event to save it for later
-   Sees the join action button based on event type:

Event Type

Button Shown

Public Free

Join

Public Paid

Pay & Join

Private Free

Request to Join

Private Paid

Pay & Request

----------

### Step 3 — Joining an Event

**Flow A — Public Free**

1.  User clicks **Join**
2.  Participation record created instantly with status `CONFIRMED`
3.  Confirmation email sent
4.  Event appears in Dashboard → My Joined Events with badge `Confirmed`

**Flow B — Public Paid**

1.  User clicks **Pay & Join**
2.  Redirected to payment checkout (Stripe)
3.  Completes payment → gateway calls webhook
4.  Server verifies payment → participation record created with status `CONFIRMED`
5.  Payment receipt email sent
6.  Event appears in Dashboard → My Joined Events with badge `Confirmed`

**Flow C — Private Free**

1.  User clicks **Request to Join**
2.  Participation record created with status `PENDING`
3.  Host gets notified of new request
4.  User waits — event appears in Dashboard → My Joined Events with badge `Pending`
5.  Host approves or rejects (see Host Flow below)
6.  User gets notified of decision via email

**Flow D — Private Paid**

1.  User clicks **Pay & Request**
2.  Redirected to payment checkout
3.  Completes payment → gateway calls webhook
4.  Server verifies payment → participation record created with status `PENDING`
5.  Payment receipt sent, host notified
6.  User waits — badge shows `Pending`
7.  If host **approves** → status becomes `CONFIRMED`
8.  If host **rejects** → status becomes `REJECTED` → **refund initiated automatically**

----------

### Step 4 — Receiving an Invitation

When a host invites a user:

1.  User sees it in Dashboard → **Pending Invitations**
2.  Sees event details, host name, and fee
3.  Three possible actions:
    -   **Free event** → Accept (instant `CONFIRMED`) or Decline
    -   **Paid event** → Pay & Accept (goes through checkout → `CONFIRMED`) or Decline
4.  If event date passes without response → invitation auto-expires
5.  Confirmed invitation appears in My Joined Events

----------

### Step 5 — Creating an Event

User goes to Dashboard → My Events → **Create Event**:

1.  Fills in the event form:
    -   Title, description (rich text), date, time, timezone
    -   Venue name + address OR online link
    -   Banner image upload
    -   Category and tags
    -   Public / Private toggle
    -   Registration fee (0 = Free)
    -   Max participants limit (optional)
    -   Registration deadline (optional)
2.  Submits → event created with status `DRAFT`
3.  User publishes it → status becomes `ACTIVE`
4.  Event is now visible on the Events Page (if Public)

----------

### Step 6 — Managing Your Event (as Host)

From Dashboard → My Events → select an event:

**Participant Management**

1.  Sees full participant list (name, photo, join date, payment status, approval status)
2.  Sees pending requests queue
3.  Can **Approve** a request → participant status → `CONFIRMED`, participant notified
4.  Can **Reject** a request → participant status → `REJECTED`, participant notified, refund triggered if paid
5.  Can **Ban** a confirmed participant → removed from event, blocked from re-joining
6.  Can **Unban** a participant
7.  Can search participants by name/email
8.  Can export participant list as CSV

**Invitation Management**

1.  Searches for registered users by name/email
2.  Sends invitation (up to 50 per event)
3.  Monitors invitation statuses (Pending / Accepted / Declined)
4.  Can revoke a pending invitation
5.  Can resend a reminder

**Event Editing**

1.  Can edit all event fields
2.  Cannot change Free → Paid after participants have joined (server-side guard)
3.  On save → all confirmed participants get an "Event Updated" email

**Event Deletion**

1.  Clicks Delete → confirmation modal
2.  Event soft-deleted
3.  Refunds automatically initiated for all paid participants
4.  All participants notified via email

----------

### Step 7 — Writing a Review

After an event has ended and the user attended:

1.  User goes to the Event Detail Page
2.  Sees **Write a Review** section (only visible to confirmed attendees post-event)
3.  Submits star rating (1–5) and optional written review
4.  Review appears on the event page immediately
5.  Average rating on the event card updates
6.  Can **edit** the review within 7 days
7.  Can **delete** the review within 7 days

----------

### Step 8 — Dashboard Overview

User's dashboard sidebar gives access to:

Section

What they see

My Events

All events they created with stats (participants, pending, revenue)

My Joined Events

All events joined/requested with status badges

Pending Invitations

All received invitations with accept/decline actions

My Reviews

All reviews written with edit/delete options

My Bookmarks

Saved events with quick links

Settings

Profile, password, notification prefs, delete account

----------

## 👑 Admin Flow — Full Journey

Admin logs in with an Admin-role account and lands on the **Admin Dashboard**.

----------

### Admin Dashboard Overview

-   Sees summary cards: Total Users, Total Events, Revenue, Pending Reports
-   Sees line chart of new registrations over time
-   Sees bar chart of events by category
-   Sees recent activity feed (latest joins, events, registrations)

----------

### Managing Users

From `/admin/users`:

1.  Sees full paginated user list searchable by name/email
2.  Filters by role (Admin/User) or status (Active/Banned)
3.  Clicks into any user → sees their full profile (events created, events joined, reviews written)
4.  Can **Ban** a user → account deactivated, user can't login
5.  Can **Unban** a user → account reactivated
6.  Can **Permanently Delete** a user → cascades (events, participations, reviews all cleaned up)
7.  Can **Promote** a User → Admin role
8.  Can **Demote** an Admin → User role

----------

### Managing Events

From `/admin/events`:

1.  Sees ALL events on the platform (Public + Private) — Admin bypasses visibility restrictions
2.  Searches by title, organizer, category, date range
3.  Can **Feature** any event → it becomes the homepage Hero Section event (replaces previous)
4.  Can **Unfeature** the current featured event
5.  Can **Delete** any event with an optional reason logged in `EventDeletionLog`
6.  Can drill into any event → see its participant list and payment records

----------

### Managing Reviews

From `/admin/reviews`:

1.  Sees all reviews across the platform
2.  Can **Delete** any review that is inappropriate or abusive
3.  All deletions logged in `ActivityLog`

----------

### Reports & Analytics

From `/admin/reports`:

1.  Views **Revenue Report** → total fees collected, filterable by date range
2.  Views **Top Events** by participant count
3.  Views **Top Organizers** by event count
4.  Exports **User List** as CSV
5.  Exports **Event List** as CSV
6.  Views **Summary Stats** (total users, total events, total revenue)

----------

### Platform Settings

From `/admin/settings`:

1.  Updates platform name and logo
2.  Toggles **Maintenance Mode** (blocks all public access with a maintenance page)
3.  Manages the featured event slot

----------

## 🔄 Cross-Cutting Flows

### Payment Webhook Flow

```
User pays → Gateway processes → Gateway POSTs to /api/payments/webhook
→ Server verifies signature → Updates Payment status to COMPLETED
→ Creates/Updates Participation record → Sends confirmation email

```

### Refund Flow

```
Host rejects paid participant OR Host deletes event
→ Server finds Payment record → Calls gateway refund API
→ Updates Payment status to REFUNDED → Notifies user via email

```

### Token Expiry Flow

```
Access token expires → Client detects 401 response
→ Client sends refresh token → Server issues new access token
→ Original request retried transparently

```

### Event Lifecycle

```
Draft → Active → Ended (auto, after endDate passes)
                → Cancelled (by host or Admin deletion)

```

### Participation Status Lifecycle

```
(join/request) → PENDING
PENDING → CONFIRMED (host approves / public free auto)
PENDING → REJECTED (host rejects → refund if paid)
CONFIRMED → BANNED (host bans)
CONFIRMED → CANCELLED (user leaves before event)

```

### Invitation Lifecycle

```
PENDING → ACCEPTED (user accepts → participation created)
PENDING → DECLINED (user declines)
PENDING → EXPIRED (event date passes)
PENDING → REVOKED (host revokes)

```

----------

This is the complete A-to-Z flow of every interaction on the platform across all roles, states, and edge cases. Each lifecycle diagram maps directly to the status enums in your data models and the endpoints in your API