# Nebula X Commute Planner — Implementation Plan

## Goal
Build a mobile-first web app that improves daily public transport commutes for Singapore users. The app uses real LTA Datamall data, lets users prioritize comfort vs. time, recommends routes with AI, saves favorite routes/stops, and alerts users when incidents affect their favorites.

## Key Decisions (from clarification)
- **Data**: Singapore public APIs (LTA Datamall)
- **AI scope**: Route recommendations only
- **Auth & persistence**: Full accounts with saved favorites and alert history
- **Notifications**: In-app alerts only (no push)

## Phase 1 — Backend Foundation

### 1.1 Enable Lovable Cloud
- Provision Supabase project for auth, database, and serverless functions.
- Configure email/password auth and Google OAuth (default social provider).
- Set up `profiles` table with auto-creation trigger on signup.

### 1.2 Database Schema
```text
profiles
  id (uuid, fk auth.users)
  display_name
  avatar_url
  created_at

favorite_routes
  id (uuid)
  user_id (uuid, fk profiles)
  name
  origin_name, origin_lat, origin_lng
  destination_name, destination_lat, destination_lng
  priority (comfort | time | balanced)
  filters (jsonb: seat_availability, less_walking, aircon, etc.)
  created_at

favorite_stops
  id (uuid)
  user_id (uuid, fk profiles)
  stop_name, stop_code, stop_lat, stop_lng, transport_type
  created_at

alerts
  id (uuid)
  user_id (uuid, fk profiles)
  title, body, severity
  affected_route_or_stop
  is_read
  created_at
```

### 1.3 LTA Datamall Integration
- Store LTA Account Key as a project secret.
- Create server functions to fetch:
  - Bus stops and bus arrival times
  - Train service status / incidents
  - Crowd density / service disruption data
- Cache results in Supabase for short TTL to avoid rate limits.

## Phase 2 — Route Planning & AI Recommendations

### 2.1 Route Search
- User inputs origin and destination (search by place name or current location).
- Server function queries LTA data to build candidate routes combining bus and MRT/LRT.
- Each candidate includes: total time, walking distance, transfers, expected crowding, seat availability.

### 2.2 Priority Scoring
- User selects priority: **Comfort**, **Time**, or **Balanced**.
- Apply rule-based scoring using:
  - Travel time
  - Crowd level
  - Number of transfers
  - Walking distance
  - Seat availability (where data exists)

### 2.3 AI Recommendation
- Send candidate routes and user priority to Lovable AI Gateway.
- AI returns a ranked recommendation with a short explanation.
- Surface the top recommendation and allow users to compare alternatives.

### 2.4 Filters
- Add filters for:
  - Seat availability
  - Fewer transfers
  - Less walking
  - Air-conditioned bus/train preference
  - Accessibility-friendly routes

## Phase 3 — Favorites & Alerts

### 3.1 Favorites
- Save favorite routes and stops from search results.
- List favorites on a dedicated screen.
- Quick re-plan from a favorite route.

### 3.2 Incident Alerts
- Poll LTA incident/service status data.
- Match incidents against user favorites (route lines, stops, stations).
- Create `alerts` rows for affected users.
- Show an in-app notification bell with unread count and an alerts feed.
- Mark alerts as read.

## Phase 4 — UI / UX

### 4.1 Public Routes
- `/` — Landing page with value prop and sign-in CTA
- `/auth` — Login / signup (managed by Lovable Cloud scaffold)

### 4.2 Authenticated Routes (under `_authenticated`)
- `/planner` — Main commute planner (origin, destination, priority, filters, results)
- `/favorites` — Saved routes and stops
- `/alerts` — Incident notifications feed
- `/profile` — Display name, preferences, sign out

### 4.3 Mobile-First Design
- Bottom tab navigation for authenticated users.
- Large touch targets, clear cards for routes, and a simple step-by-step itinerary view.
- Dark mode support via existing theme tokens.

## Phase 5 — Verification

- Verify LTA API calls return expected data.
- Test AI recommendation flow end-to-end.
- Confirm favorites and alerts are scoped to the signed-in user via RLS.
- Run build and typecheck.

## Out of Scope (for hackathon MVP)
- Push notifications
- Real-time GPS vehicle tracking
- Payment/ticketing integration
- Complex multi-day trip planning

## Open Requirement
- LTA Datamall Account Key: needed before API integration. I will guide you to create one at `https://datamall.lta.gov.sg/content/datamall/en/request-for-api-access.html` and store it securely.
