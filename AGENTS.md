Here’s a Codex-ready project context you can paste as the root instruction for the repo.

# Project Context

Build a **mobile-first responsive web application** for a pseudonymous peer-to-peer marketplace where users can list verified merchant-specific credit card offers and connect with other users interested in those merchants.

The product is conceptually similar to **Facebook Marketplace behind a small paywall**, but the listings represent merchant-specific card offers rather than physical goods.

The platform itself does not sell, transfer, broker, settle, or guarantee the underlying offer or transaction.

Its role is limited to:

- discovery
- offer verification
- pseudonymous profiles
- reputation
- paid chat access
- peer-to-peer messaging
- moderation and trust/safety

The platform earns revenue through a small fixed fee, such as **$1.99 to unlock a conversation**.

---

# Example

User A has:

Adobe  
Spend $600  
Receive $250 statement credit  
Expires December 31

User A lists the offer.

User B searches for Adobe and sees User A's verified listing.

User B pays $1.99 to unlock chat.

User A and User B communicate privately.

The platform does not need to know whether they complete any transaction afterward.

---

# Core Product Principle

Always preserve this boundary:

**The platform verifies, discovers, and connects. Users independently decide what they do after connecting.**

Do not design features that make the platform:

- a seller of card offers
- a transfer mechanism for card rewards
- an escrow provider
- a user-to-user payment processor
- a broker of underlying purchases
- a guarantor of statement credits
- a system for sharing card credentials

---

# Recommended Technology Stack

Use:

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

Use Next.js server-side functionality initially:

- Server Actions
- Route Handlers / API routes

Do not create a separate backend service unless required.

## Database

Use:

- PostgreSQL
- Supabase

## Authentication

Use:

- Supabase Auth

Required account verification:

- Email verification
- Phone verification

Government ID verification is NOT required for MVP.

## Realtime Messaging

Use:

- Supabase Realtime

## Storage

Use:

- Supabase Storage

Verification evidence must be stored privately.

## Payments

Use:

- Stripe

For MVP, Stripe should process only platform fees such as:

`$1.99 Unlock Chat`

Do not implement user-to-user payments.

## Hosting

Use:

- Vercel

## Future Mobile App

If native mobile apps are later required:

- Expo
- React Native
- TypeScript

The existing Supabase backend should remain reusable.

---

# Application Design

Build the web app **mobile-first**.

The application must work well on:

- iPhone
- Android phones
- tablets
- desktop browsers

The first implementation should be a responsive web application.

It should also be structured so it can operate as a PWA.

---

# Navigation

Recommended mobile bottom navigation:

- Search
- My Offers
- Add
- Messages
- Profile

Desktop navigation may use:

- top navigation
- sidebar
- responsive marketplace layout

---

# User Model

Users interact publicly through **pseudonymous usernames**.

Example:

DealPilot82

Public profile:

- username
- avatar
- rating
- review count
- completed interactions
- phone verified badge
- number of active verified offers
- optional trust badges
- join date
- response rate

Do NOT publicly expose:

- legal name
- email
- phone number
- physical address
- payment information
- full credit card number
- last 4 card digits
- issuer login credentials
- verification screenshots
- government ID information

---

# Progressive Verification

Use three conceptual trust levels.

## Level 1 — Account Verification

Required:

- email verified
- phone verified
- Terms of Service accepted
- Privacy Policy accepted

## Level 2 — Offer Verification

Required before publishing a listing.

Verification confirms only that evidence of the offer was provided.

It does NOT guarantee that a future purchase will qualify.

Display:

**Offer Verified**

Recommended disclaimer:

"Offer verification confirms that evidence of this offer was provided at the time of verification. The platform does not guarantee that any transaction will qualify for the benefit."

## Level 3 — Optional Identity Verification

Not required for MVP.

The architecture may support optional identity verification later.

---

# Multiple Credit Cards

A user may have multiple credit cards.

A single credit card may have multiple offers.

Relationship:

User  
→ many CreditCardProfiles  
→ each card has many Offers

Example:

User

Card A
- Adobe offer
- Dell offer
- FedEx offer

Card B
- Nike offer
- Marriott offer

Card C
- Samsung offer

Each offer is its own independent listing.

---

# Credit Card Profile

Card profiles are private organizational records.

Suggested fields:

- id
- userId
- issuer
- nickname
- last4Optional
- cardTypeOptional
- status
- createdAt
- updatedAt

Never store:

- CVV
- PIN
- issuer username/password

For MVP, do NOT store full card numbers.

Card nicknames are private.

Example:

"Business Card"

"Travel Card"

"Personal Card"

---

# Offer Model

Each offer belongs to:

- one user
- one credit card profile
- one merchant

Required offer fields:

- merchant
- spend requirement
- reward amount
- reward type
- description
- expiration date
- verification status
- listing status

Example:

Merchant: Adobe

Spend Requirement: 600

Reward Amount: 250

Reward Type: STATEMENT_CREDIT

Expiration Date: 2026-12-31

Verification Status: VERIFIED

Listing Status: ACTIVE

---

# Offer Verification

For MVP, verification may be manual.

User workflow:

Create Listing

→ Select Card

→ Select Merchant

→ Enter Offer Details

→ Upload Evidence

→ Verification Pending

→ Admin Reviews

→ Verified

→ Listing Published

Verification statuses:

- PENDING
- VERIFIED
- REJECTED
- NEEDS_REVIEW
- EXPIRED

Listing statuses:

- DRAFT
- PENDING_VERIFICATION
- ACTIVE
- PAUSED
- EXPIRED
- REMOVED

---

# Verification Evidence

Verification evidence is sensitive private information.

Possible evidence:

- screenshot
- uploaded image
- uploaded document

Store evidence in private Supabase Storage buckets.

Never expose raw evidence publicly.

Use:

- private buckets
- signed URLs
- short expiration times
- role-based access
- authorization checks

Only:

- offer owner
- authorized moderators/admins

should be able to access verification evidence when required.

---

# Critical Privacy Requirement

This is a hard architectural requirement.

**Public marketplace data should contain the minimum information necessary for users to evaluate an offer and another user's reputation. Cardholder-identifying information and verification evidence must remain private and must never be exposed through public listings, profiles, URLs, metadata, or search indexing.**

This applies to:

- frontend components
- API responses
- URLs
- HTML metadata
- Open Graph metadata
- page source
- analytics
- logs
- search engine indexing
- sitemap generation
- public storage
- browser-visible identifiers

---

# Public Offer Information

A public listing may show:

- merchant
- spend threshold
- reward amount
- reward type
- expiration
- Offer Verified badge
- pseudonymous username
- user rating
- interaction count
- response rate
- trust badges

Example:

Adobe

Spend $600  
Receive $250 statement credit  
Expires Dec 31

Offer Verified

DealPilot82  
4.9 stars  
31 interactions

Unlock Chat — $1.99

---

# Do Not Publicly Display

Never expose:

- legal name
- email
- phone
- cardholder name
- last 4 digits
- full card number
- expiration date of the credit card
- CVV
- private card nickname
- issuer account number
- membership ID
- issuer login credentials
- uploaded verification evidence
- raw file metadata
- internal financial identifiers

The exact card product should also remain private by default.

Issuer visibility should be optional and should not be required for the core marketplace.

---

# Public IDs

Use opaque random IDs.

Prefer:

- UUID
- ULID

Do NOT derive IDs from:

- username
- email
- phone
- card number
- legal name
- issuer identifiers

Good:

`/offers/01J8W9R9QG3F7C4E1D`

Bad:

`/john-smith/amex-4821/adobe`

---

# Search Engine Privacy

Marketing pages may be indexed.

Marketplace user profiles and detailed offer pages should generally:

- require authentication
- use noindex where appropriate
- not appear in public sitemap files

Do not expose identifying data to search engines.

---

# Merchant Model

Create a Merchant table.

Fields:

- id
- name
- slug
- logoUrl
- category
- createdAt
- updatedAt

Examples:

Adobe  
Dell  
Nike  
Best Buy  
Samsung  
Marriott

Users search primarily by merchant.

---

# Search

Users should be able to search offers by merchant.

Filters:

- merchant
- minimum reward
- maximum spend requirement
- expiration
- user rating
- verified only
- recently active
- recently posted

Sort options:

- newest
- highest reward
- lowest required spend
- expiring soon
- highest rated user

---

# Merchant Pages

A merchant page may show:

Adobe

17 active verified offers

Then list relevant offers.

Future feature:

Follow Merchant

Example:

Notify me when a new Adobe offer is posted.

Do not build advanced alerting for MVP unless easy.

---

# Paid Chat

Primary monetization:

**Unlock Chat — $1.99**

For MVP:

Person B pays $1.99 to unlock a conversation with Person A.

The platform fee is for access to communication.

It is NOT:

- a brokerage percentage
- transaction commission
- success fee
- escrow fee

---

# Stripe Payment Flow

Recommended flow:

User clicks:

Unlock Chat — $1.99

→ Create Stripe Checkout Session

→ User completes payment

→ Stripe webhook verifies payment

→ Create/update conversation access record

→ Conversation becomes unlocked

→ Users can message each other

Never trust client-side payment state.

Always validate payment server-side through Stripe webhooks.

---

# Conversation Model

A conversation belongs to:

- one listing
- User A
- User B

Suggested statuses:

- LOCKED
- ACTIVE
- COMPLETED
- NO_AGREEMENT
- CLOSED
- REPORTED

Only conversation participants may access messages.

---

# Messaging

Required:

- send text messages
- receive messages in realtime
- conversation history
- timestamps
- read state
- block user
- report user
- listing reference

Use Supabase Realtime.

Do not expose private messages publicly.

---

# Sensitive Message Detection

Warn or block users from sending obvious sensitive credentials such as:

- full credit card numbers
- CVV
- passwords
- Social Security numbers
- issuer login credentials
- bank account credentials

Implement basic server-side checks.

Do not rely exclusively on client-side validation.

---

# Reputation System

After an interaction, users may rate each other.

Suggested fields:

- overall score
- communication score
- reliability score
- listing accuracy score
- optional review text

Ratings should be linked to real conversations.

Do not allow arbitrary users to review each other.

---

# Trust Badges

Possible badges:

- Phone Verified
- Offer Verified
- Identity Verified
- 10+ Interactions
- 50+ Interactions
- Highly Rated

Never use issuer endorsement-style wording.

Do not display:

- Amex Approved
- Chase Approved
- Citi Verified Seller

unless officially authorized.

---

# Reporting

Users must be able to report:

- fake offer
- scam attempt
- harassment
- spam
- fake profile
- suspicious financial request
- credential request
- stolen card behavior
- misleading listing

---

# Admin Dashboard

Admins need:

## User Management

- username
- email
- phone verification status
- account status
- risk status
- ratings
- active listings
- reports

## Offer Verification

- offer details
- evidence
- verification status
- approve
- reject
- request review

## Moderation

- reports
- flagged messages
- suspended accounts
- removed listings

## Analytics

- total users
- active users
- listings
- verified offers
- top merchants
- searches
- chat unlocks
- revenue
- conversion rate
- repeat users

---

# Role Model

At minimum:

- USER
- MODERATOR
- ADMIN

Use role-based authorization.

Never rely on frontend checks for authorization.

---

# Database Security

Supabase Row Level Security is mandatory.

Use RLS policies to enforce access.

Examples:

## Public Marketplace Data

Authenticated users may read sanitized active offer views.

## Credit Card Profiles

Only the card owner may read/write.

## Verification Evidence

Only:

- owner
- moderator
- admin

may access.

## Conversations

Only:

- User A
- User B
- authorized moderators when required for an active report

may access.

## Messages

Only conversation participants may normally read.

---

# Recommended Database Model

## users

- id
- username
- email
- email_verified
- phone
- phone_verified
- avatar_url
- rating_average
- rating_count
- completed_interaction_count
- response_rate
- optional_identity_verified
- account_status
- risk_status
- created_at
- updated_at

## credit_card_profiles

- id
- user_id
- issuer
- nickname
- last4_optional
- card_type_optional
- status
- created_at
- updated_at

## merchants

- id
- name
- slug
- logo_url
- category
- created_at
- updated_at

## offers

- id
- user_id
- card_id
- merchant_id
- title
- description
- spend_requirement
- reward_amount
- reward_type
- expiration_date
- verification_status
- verification_timestamp
- listing_status
- created_at
- updated_at

## offer_verifications

- id
- offer_id
- card_id
- evidence_path
- extracted_merchant
- extracted_spend_requirement
- extracted_reward
- extracted_expiration
- reviewer_id
- status
- created_at
- updated_at

## conversations

- id
- listing_id
- user_a_id
- user_b_id
- unlock_status
- status
- created_at
- updated_at

## messages

- id
- conversation_id
- sender_id
- content
- moderation_status
- created_at
- read_at

## ratings

- id
- conversation_id
- reviewer_id
- reviewed_user_id
- overall_score
- communication_score
- reliability_score
- accuracy_score
- review_text
- created_at

## platform_payments

- id
- user_id
- conversation_id
- amount
- currency
- payment_provider
- payment_provider_transaction_id
- status
- created_at

## reports

- id
- reporter_id
- reported_user_id
- conversation_id
- offer_id
- reason
- description
- status
- created_at
- resolved_at

---

# MVP Scope

Build only the following initially:

1. Landing page
2. Account registration
3. Email verification
4. Phone verification
5. Pseudonymous profile creation
6. Login/logout
7. User dashboard
8. Add multiple credit card profiles
9. Add multiple offers per card
10. Merchant database
11. Merchant search
12. Create listing
13. Upload offer evidence
14. Admin verification
15. Publish verified offer
16. View marketplace listings
17. View pseudonymous user reputation
18. Stripe $1.99 chat unlock
19. Private realtime chat
20. Mark interaction completed
21. Peer ratings
22. Block user
23. Report user
24. Automatic offer expiration
25. Admin dashboard
26. Basic marketplace analytics

---

# Explicitly Out of Scope for MVP

Do not build:

- mandatory government ID verification
- bank account linking
- direct issuer integrations
- issuer scraping
- user-to-user payments
- escrow
- wallet functionality
- merchant payment processing
- cashback settlement
- crypto
- complex recommendation engines
- AI-based matching
- native iOS application
- native Android application

---

# Mobile UX

Prioritize mobile usability.

Use:

- large touch targets
- bottom navigation
- full-width cards
- sticky primary actions
- responsive dialogs/drawers
- minimal text density
- clear reputation indicators

Primary mobile flow:

Search

→ Merchant

→ Offer Listing

→ User Reputation

→ Unlock Chat

→ Message

→ Complete Interaction

→ Rate User

---

# Cardholder UX

Cardholder flow:

Dashboard

→ My Cards

→ Add Card

→ Add Offer

→ Upload Evidence

→ Pending Verification

→ Verified

→ Listing Active

→ Receive Chat Request

→ Communicate

→ Complete Interaction

→ Receive Rating

---

# Buyer UX

Buyer flow:

Search Merchant

→ Browse Verified Offers

→ Compare Reputation

→ Select Listing

→ Pay $1.99

→ Unlock Chat

→ Communicate

→ Mark Interaction Complete

→ Rate User

---

# Code Quality Requirements

Use:

- TypeScript strict mode
- reusable components
- clear domain separation
- server-side authorization
- schema validation
- structured error handling
- consistent naming
- accessible UI
- responsive layouts

Prefer:

- Zod for validation
- React Hook Form where appropriate
- server-side validation for all mutations

Do not trust frontend input.

---

# Security Requirements

Implement:

- HTTPS only
- Supabase RLS
- role-based authorization
- private storage buckets
- signed URLs
- rate limiting where appropriate
- server-side input validation
- XSS-safe rendering
- CSRF-safe patterns
- secure Stripe webhooks
- audit logs for admin actions
- session revocation
- account suspension

Do not store unnecessary financial information.

---

# Privacy Requirements

Public marketplace data should contain only what is necessary to evaluate:

- an offer
- a pseudonymous user's reputation

Cardholder-identifying information must remain private.

Verification evidence must remain private.

Do not leak sensitive data through:

- public APIs
- URLs
- query strings
- analytics
- logs
- metadata
- image URLs
- search indexes
- sitemap files
- frontend state exposed unnecessarily to the browser

---

# Architecture Principle

Separate data into:

## Public Marketplace Data

Safe for authenticated marketplace display.

## Private User Data

Visible only to account owner.

## Sensitive Verification Data

Visible only to authorized roles.

Do not return full database rows directly to the frontend.

Create explicit DTOs / response models for public data.

Example:

`PublicOfferDTO`

should intentionally contain only fields safe for marketplace display.

---

# Product Positioning

Describe the platform as:

**A pseudonymous peer-to-peer discovery marketplace for verified merchant-specific card offers.**

The central promise is:

**Find people with relevant merchant offers, verify that the offer exists, connect privately, and use reputation to decide who you trust.**

---

# Development Strategy

Build incrementally.

Recommended order:

1. Project foundation
2. Database schema
3. Supabase Auth
4. RLS policies
5. Pseudonymous user profiles
6. Merchant model
7. Credit card profile management
8. Offer creation
9. Private evidence upload
10. Admin offer verification
11. Marketplace search
12. Listing details
13. Stripe payment
14. Conversation unlock
15. Realtime messaging
16. Ratings
17. Reports
18. Admin moderation
19. Mobile/PWA polish

Do not attempt to implement every future feature at once.

Before generating large amounts of code, inspect the existing repository and reuse existing architecture, components, conventions, and dependencies whenever appropriate.