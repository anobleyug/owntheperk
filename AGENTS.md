Here’s a Codex-ready project context you can paste as the root instruction for the repo.



**# Project Context**

Build a **mobile-first responsive web application** for a pseudonymous peer-to-peer marketplace where cardholders can create listings referencing verified merchant-specific credit card offers and connect with buyers interested in those merchants.

The product is conceptually similar to **Facebook Marketplace behind a small paywall**, but the marketplace contains user listings tied to a shared catalog of merchant/card offers rather than physical goods.

A critical domain rule is that an **Offer is a shared/core entity**, not a unique record for every cardholder. The same credit-card promotion is often available to many eligible cardholders. Therefore:

- `offers` represents the canonical/shared offer definition.
- `offer_listings` represents an individual cardholder making themselves available for that offer.
- Many `offer_listings` may reference the same `offer`.
- A user may have multiple credit cards.
- A user may create multiple listings across multiple cards/offers.

Each user listing adds marketplace-specific terms such as:

- **Min Spend** — the minimum purchase/spend amount the cardholder is willing or required to support for the listing.
- **Ask** — the amount the cardholder is asking from the interested user.
- **OBO** — whether the ask is negotiable / "or best offer".

Example marketplace pricing:

`Min Spend: $600 · Ask: $500`

or

`Min Spend: $600 · Ask: $500 OBO`

These fields are important buyer-facing marketplace filters.

The platform itself does not sell, transfer, broker, settle, or guarantee the underlying offer or transaction.

Its role is limited to:

- discovery
- shared offer catalog / normalization
- user listing verification
- pseudonymous profiles
- reputation
- paid chat access
- peer-to-peer messaging
- moderation and trust/safety

The platform earns revenue through a small fixed fee, such as **$1.99 to unlock a conversation**.

---

**# Example**

A canonical offer exists in the shared offer catalog:

Adobe  
Spend $600  
Receive $250 statement credit  
Expires December 31

Multiple eligible cardholders may have this exact same offer.

User A has the offer on one of their cards and creates a marketplace listing referencing the canonical Adobe offer:

`Min Spend: $600`

`Ask: $500 OBO`

User C may reference the same canonical offer but create a different listing:

`Min Spend: $600`

`Ask: $475`

User B searches for Adobe and sees both listings side-by-side. The buyer can compare:

- minimum spend
- asking amount
- whether OBO is accepted
- expiration
- verification status
- seller reputation

User B pays $1.99 to unlock chat with the selected cardholder.

The users then communicate privately.

The platform does not need to know whether they complete any transaction afterward.

---

**# Core Product Principle**



Always preserve this boundary:



**\*\*The platform verifies, discovers, and connects. Users independently decide what they do after connecting.\*\***



Do not design features that make the platform:



\- a seller of card offers

\- a transfer mechanism for card rewards

\- an escrow provider

\- a user-to-user payment processor

\- a broker of underlying purchases

\- a guarantor of statement credits

\- a system for sharing card credentials



\---



**# Recommended Technology Stack**



Use:



**## Frontend**



\- Next.js

\- React

\- TypeScript

\- Tailwind CSS

\- shadcn/ui



**## Backend**



Use Next.js server-side functionality initially:



\- Server Actions

\- Route Handlers / API routes



Do not create a separate backend service unless required.



**## Database**



Use:



\- PostgreSQL

\- Supabase



**## Authentication**



Use:



\- Supabase Auth



Required account verification:



\- Email verification

\- Phone verification



Government ID verification is NOT required for MVP.



**## Realtime Messaging**



Use:



\- Supabase Realtime



**## Storage**



Use:



\- Supabase Storage



Verification evidence must be stored privately.



**## Payments**



Use:



\- Stripe



For MVP, Stripe should process only platform fees such as:



\`$1.99 Unlock Chat\`



Do not implement user-to-user payments.



**## Hosting**

Use:

\- Railway

Configure Next.js for self-hosted Railway deployment, using standalone output when appropriate.



**## Future Mobile App**



If native mobile apps are later required:



\- Expo

\- React Native

\- TypeScript



The existing Supabase backend should remain reusable.



\---



**# Application Design**



Build the web app **\*\*mobile-first\*\***.



The application must work well on:



\- iPhone

\- Android phones

\- tablets

\- desktop browsers



The first implementation should be a responsive web application.



It should also be structured so it can operate as a PWA.



\---



**# Navigation**



Recommended mobile bottom navigation:



\- Search

\- My Offers

\- Add

\- Messages

\- Profile



Desktop navigation may use:



\- top navigation

\- sidebar

\- responsive marketplace layout



\---



**# User Model**



Users interact publicly through **\*\*pseudonymous usernames\*\***.



Example:



DealPilot82



Public profile:



\- username

\- avatar

\- rating

\- review count

\- completed interactions

\- phone verified badge

\- number of active verified offers

\- optional trust badges

\- join date

\- response rate



Do NOT publicly expose:



\- legal name

\- email

\- phone number

\- physical address

\- payment information

\- full credit card number

\- last 4 card digits

\- issuer login credentials

\- verification screenshots

\- government ID information



\---



**# Progressive Verification**



Use three conceptual trust levels.



**## Level 1 — Account Verification**



Required:



\- email verified

\- phone verified

\- Terms of Service accepted

\- Privacy Policy accepted



**## Level 2 — Offer Verification**



Required before publishing a listing.



Verification confirms only that evidence of the offer was provided.



It does NOT guarantee that a future purchase will qualify.



Display:



**\*\*Offer Verified\*\***



Recommended disclaimer:



"Offer verification confirms that evidence of this offer was provided at the time of verification. The platform does not guarantee that any transaction will qualify for the benefit."



**## Level 3 — Optional Identity Verification**



Not required for MVP.



The architecture may support optional identity verification later.



\---



**# Multiple Credit Cards and Shared Offers**

A user may have multiple credit cards.

A single credit card may contain multiple eligible offers.

However, offers themselves are **shared canonical entities**. Do not create a duplicate canonical offer row for every cardholder who has the same promotion.

Core relationship:

```text
User
  → many CreditCardProfiles

Offer (shared catalog entity)
  → referenced by many OfferListings

OfferListing
  → belongs to one User
  → optionally references one private CreditCardProfile
  → references exactly one canonical Offer
```

Example:

Canonical Offer #101:

- Merchant: Adobe
- Spend requirement: $600
- Benefit: $250 statement credit
- Expiration: Dec 31

User A / Business Card:

- references Offer #101
- Min Spend: $600
- Ask: $500 OBO

User C / Personal Card:

- references Offer #101
- Min Spend: $600
- Ask: $480 fixed

The buyer should see two marketplace listings, but the database should retain one canonical offer definition.

This separation is important for:

- deduplicating common offers
- clean merchant pages
- consistent offer details
- buyer filtering
- analytics
- future automated offer matching
- easier verification/admin workflows

---

**# Credit Card Profile**



Card profiles are private organizational records.



Suggested fields:



\- id

\- userId

\- issuer

\- nickname

\- last4Optional

\- cardTypeOptional

\- status

\- createdAt

\- updatedAt



Never store:



\- CVV

\- PIN

\- issuer username/password



For MVP, do NOT store full card numbers.



Card nicknames are private.



Example:



"Business Card"



"Travel Card"



"Personal Card"



\---



**# Offer and Listing Model**

The domain must distinguish between a **canonical Offer** and a **user OfferListing**.

## Canonical Offer

`offers` is the shared/core catalog entity describing the underlying promotion.

An offer may be available to many cardholders and may therefore be referenced by many user listings.

Suggested canonical offer fields:

- id
- merchant_id
- issuer_optional
- card_product_optional
- title
- description
- spend_requirement
- reward_amount
- reward_type
- expiration_date
- terms_summary_optional
- status
- created_at
- updated_at

Example:

Merchant: Adobe

Spend Requirement: 600

Reward Amount: 250

Reward Type: STATEMENT_CREDIT

Expiration Date: 2026-12-31

The canonical offer should not contain user-specific pricing or reputation data.

## Offer Listing

`offer_listings` represents one cardholder making themselves available around a canonical offer.

Each listing belongs to:

- one user
- one canonical offer
- zero or one private credit card profile, depending on implementation

A listing must contain buyer-facing marketplace terms.

Recommended listing fields:

- id
- user_id
- offer_id
- card_id
- min_spend
- ask_amount
- accepts_best_offer
- currency
- seller_notes_optional
- verification_status
- verification_timestamp
- listing_status
- created_at
- updated_at

Example listing:

Canonical Offer: Adobe — $250 statement credit after $600

Min Spend: 600

Ask Amount: 500

Accepts Best Offer: true

Public display:

`Min Spend $600 · Ask $500 OBO`

Another cardholder may reference the same canonical offer and post:

`Min Spend $600 · Ask $475`

## Marketplace Pricing Semantics

`min_spend` is the marketplace listing's minimum spend requirement shown to buyers.

`ask_amount` is what the listing owner is asking in connection with that listing.

`accepts_best_offer = true` means the UI displays the ask as negotiable, for example:

`$500 OBO`

Do not interpret or enforce the downstream arrangement between users. These values are listing/discovery information used to help users compare and filter marketplace posts.

Recommended constraints:

- min_spend >= 0
- ask_amount >= 0
- currency defaults to USD for MVP
- one user may create multiple listings
- many users may reference the same canonical offer
- a listing owner may pause/remove their own listing
- canonical offer data should not be duplicated simply because another cardholder posts it

---

**# Offer / Listing Verification**

For MVP, verification may be manual.

Verification applies to the **cardholder's listing/evidence that they actually have access to the referenced canonical offer**.

The shared canonical offer may already exist in the catalog, but each cardholder listing must independently establish that the user has the claimed offer.

User workflow:

Create Listing

→ Select Card

→ Search/select Canonical Offer

→ If the offer does not exist, request/create a candidate canonical offer for review

→ Enter Listing Terms

→ Min Spend

→ Ask Amount

→ Fixed or OBO

→ Upload Evidence

→ Verification Pending

→ Admin Reviews

→ Verified

→ Listing Published

Listing verification statuses:

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

Verification confirms only that evidence showed the cardholder had access to the referenced offer at the time of review.

It does not guarantee that a future purchase will qualify.

---

**# Verification Evidence**



Verification evidence is sensitive private information.



Possible evidence:



\- screenshot

\- uploaded image

\- uploaded document



Store evidence in private Supabase Storage buckets.



Never expose raw evidence publicly.



Use:



\- private buckets

\- signed URLs

\- short expiration times

\- role-based access

\- authorization checks



Only:



\- offer owner

\- authorized moderators/admins



should be able to access verification evidence when required.



\---



**# Critical Privacy Requirement**



This is a hard architectural requirement.



**\*\*Public marketplace data should contain the minimum information necessary for users to evaluate an offer and another user's reputation. Cardholder-identifying information and verification evidence must remain private and must never be exposed through public listings, profiles, URLs, metadata, or search indexing.\*\***



This applies to:



\- frontend components

\- API responses

\- URLs

\- HTML metadata

\- Open Graph metadata

\- page source

\- analytics

\- logs

\- search engine indexing

\- sitemap generation

\- public storage

\- browser-visible identifiers



\---



**# Public Marketplace Listing Information**

A public marketplace card should clearly separate the underlying offer benefit from the cardholder's listing terms.

A public listing may show:

- merchant
- canonical offer benefit
- canonical offer spend requirement where useful
- listing Min Spend
- listing Ask amount
- `OBO` indicator when `accepts_best_offer = true`
- expiration
- Offer/Listing Verified badge
- pseudonymous username
- user rating
- interaction count
- response rate
- trust badges

Example:

Adobe

$250 statement credit

Min Spend: $600  
Ask: $500 OBO

Expires Dec 31

Offer Verified

DealPilot82  
4.9 stars  
31 interactions

Unlock Chat — $1.99

The buyer should be able to understand the important economics of a listing without opening the detail page.

---

**# Do Not Publicly Display**



Never expose:



\- legal name

\- email

\- phone

\- cardholder name

\- last 4 digits

\- full card number

\- expiration date of the credit card

\- CVV

\- private card nickname

\- issuer account number

\- membership ID

\- issuer login credentials

\- uploaded verification evidence

\- raw file metadata

\- internal financial identifiers



The exact card product should also remain private by default.



Issuer visibility should be optional and should not be required for the core marketplace.



\---



**# Public IDs**



Use opaque random IDs.



Prefer:



\- UUID

\- ULID



Do NOT derive IDs from:



\- username

\- email

\- phone

\- card number

\- legal name

\- issuer identifiers



Good:



\`/offers/01J8W9R9QG3F7C4E1D\`



Bad:



\`/john-smith/amex-4821/adobe\`



\---



**# Search Engine Privacy**



Marketing pages may be indexed.



Marketplace user profiles and detailed offer pages should generally:



\- require authentication

\- use noindex where appropriate

\- not appear in public sitemap files



Do not expose identifying data to search engines.



\---



**# Merchant Model**



Create a Merchant table.



Fields:



\- id

\- name

\- slug

\- logoUrl

\- category

\- createdAt

\- updatedAt



Examples:



Adobe &#x20;

Dell &#x20;

Nike &#x20;

Best Buy &#x20;

Samsung &#x20;

Marriott



Users search primarily by merchant.



\---



**# Search and Marketplace Filtering**

Users should primarily search the marketplace by merchant and compare individual `offer_listings` referencing shared canonical offers.

Buyer-facing filters should include:

- merchant
- canonical offer / benefit
- maximum Min Spend
- minimum reward amount
- maximum Ask amount
- OBO accepted only
- expiration
- seller rating
- verified listings only
- recently active sellers
- recently posted listings

Sort options should include:

- lowest Ask
- lowest Min Spend
- highest reward
- best effective value where safely derivable
- newest
- expiring soon
- highest rated user

The marketplace query should return sanitized listing DTOs. It must not expose private `card_id`, card nickname, last four digits, evidence paths, or internal verification fields.

Where multiple listings reference the same canonical offer, buyers should still see them as separate marketplace choices because seller reputation, Min Spend, Ask, and OBO status may differ.

---

**# Merchant Pages**

A merchant page should aggregate canonical offers and the active user listings referencing them.

Example:

Adobe

2 current offer types

17 active verified listings

Canonical offer:

`Spend $600 → $250 statement credit`

Listings:

- DealPilot82 — Min Spend $600 — Ask $500 OBO — 4.9 stars
- SaverHawk14 — Min Spend $600 — Ask $475 — 4.8 stars

This structure allows the buyer to understand that multiple cardholders have the same underlying offer while comparing each cardholder's marketplace terms.

Future feature:

Follow Merchant

Example:

Notify me when a new Adobe listing is posted.

Do not build advanced alerting for MVP unless easy.

---

**# Paid Chat**



Primary monetization:



**\*\*Unlock Chat — $1.99\*\***



For MVP:



Person B pays $1.99 to unlock a conversation with Person A.



The platform fee is for access to communication.



It is NOT:



\- a brokerage percentage

\- transaction commission

\- success fee

\- escrow fee



\---



**# Stripe Payment Flow**



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



\---



**# Conversation Model**

A conversation belongs to:

- one `offer_listing`
- User A / listing owner
- User B / interested user

Suggested statuses:

- LOCKED
- ACTIVE
- COMPLETED
- NO_AGREEMENT
- CLOSED
- REPORTED

The conversation should retain the listing context that existed when chat was unlocked, including at minimum:

- offer/listing ID
- merchant
- Min Spend
- Ask amount
- OBO status

This prevents confusion if the seller later edits or pauses the listing.

Only conversation participants may normally access messages.

---

**# Messaging**



Required:



\- send text messages

\- receive messages in realtime

\- conversation history

\- timestamps

\- read state

\- block user

\- report user

\- listing reference



Use Supabase Realtime.



Do not expose private messages publicly.



\---



**# Sensitive Message Detection**



Warn or block users from sending obvious sensitive credentials such as:



\- full credit card numbers

\- CVV

\- passwords

\- Social Security numbers

\- issuer login credentials

\- bank account credentials



Implement basic server-side checks.



Do not rely exclusively on client-side validation.



\---



**# Reputation System**



After an interaction, users may rate each other.



Suggested fields:



\- overall score

\- communication score

\- reliability score

\- listing accuracy score

\- optional review text



Ratings should be linked to real conversations.



Do not allow arbitrary users to review each other.



\---



**# Trust Badges**



Possible badges:



\- Phone Verified

\- Offer Verified

\- Identity Verified

\- 10+ Interactions

\- 50+ Interactions

\- Highly Rated



Never use issuer endorsement-style wording.



Do not display:



\- Amex Approved

\- Chase Approved

\- Citi Verified Seller



unless officially authorized.



\---



**# Reporting**



Users must be able to report:



\- fake offer

\- scam attempt

\- harassment

\- spam

\- fake profile

\- suspicious financial request

\- credential request

\- stolen card behavior

\- misleading listing



\---



**# Admin Dashboard**



Admins need:



**## User Management**



\- username

\- email

\- phone verification status

\- account status

\- risk status

\- ratings

\- active listings

\- reports



**## Offer Verification**



\- offer details

\- evidence

\- verification status

\- approve

\- reject

\- request review



**## Moderation**



\- reports

\- flagged messages

\- suspended accounts

\- removed listings



**## Analytics**



\- total users

\- active users

\- listings

\- verified offers

\- top merchants

\- searches

\- chat unlocks

\- revenue

\- conversion rate

\- repeat users



\---



**# Role Model**



At minimum:



\- USER

\- MODERATOR

\- ADMIN



Use role-based authorization.



Never rely on frontend checks for authorization.



\---



**# Database Security**



Supabase Row Level Security is mandatory.



Use RLS policies to enforce access.



Examples:



**## Public Marketplace Data**



Authenticated users may read sanitized active offer views.



**## Credit Card Profiles**



Only the card owner may read/write.



**## Verification Evidence**



Only:



\- owner

\- moderator

\- admin



may access.



**## Conversations**



Only:



\- User A

\- User B

\- authorized moderators when required for an active report



may access.



**## Messages**



Only conversation participants may normally read.



\---



**# Recommended Database Model**



**## users**



\- id

\- username

\- email

\- email_verified

\- phone

\- phone_verified

\- avatar_url

\- rating_average

\- rating_count

\- completed_interaction_count

\- response_rate

\- optional_identity_verified

\- account_status

\- risk_status

\- created_at

\- updated_at



**## credit_card_profiles**



\- id

\- user_id

\- issuer

\- nickname

\- last4_optional

\- card_type_optional

\- status

\- created_at

\- updated_at



**## merchants**



\- id

\- name

\- slug

\- logo_url

\- category

\- created_at

\- updated_at



**## offers**

Shared/canonical offer catalog.

- id
- merchant_id
- issuer_optional
- card_product_optional
- title
- description
- spend_requirement
- reward_amount
- reward_type
- expiration_date
- terms_summary_optional
- status
- created_at
- updated_at

One canonical offer may be referenced by many user listings.

**## offer_listings**

User/cardholder marketplace post referencing a canonical offer.

- id
- user_id
- offer_id
- card_id
- min_spend
- ask_amount
- accepts_best_offer
- currency
- seller_notes_optional
- verification_status
- verification_timestamp
- listing_status
- created_at
- updated_at

Relationship:

`offers 1 → many offer_listings`

`users 1 → many offer_listings`

`credit_card_profiles 1 → many offer_listings`

**## offer_listing_verifications**

Private evidence that a particular listing owner has access to the referenced canonical offer.

- id
- offer_listing_id
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

---

**## conversations**



\- id

\- listing_id

\- user_a_id

\- user_b_id

\- unlock_status

\- status

\- created_at

\- updated_at



**## messages**



\- id

\- conversation_id

\- sender_id

\- content

\- moderation_status

\- created_at

\- read_at



**## ratings**



\- id

\- conversation_id

\- reviewer_id

\- reviewed_user_id

\- overall_score

\- communication_score

\- reliability_score

\- accuracy_score

\- review_text

\- created_at



**## platform_payments**



\- id

\- user_id

\- conversation_id

\- amount

\- currency

\- payment_provider

\- payment_provider_transaction_id

\- status

\- created_at



**## reports**



\- id

\- reporter_id

\- reported_user_id

\- conversation_id

\- offer_id

\- reason

\- description

\- status

\- created_at

\- resolved_at



\---



**# MVP Scope**



Build only the following initially:



1\. Landing page

2\. Account registration

3\. Email verification

4\. Phone verification

5\. Pseudonymous profile creation

6\. Login/logout

7\. User dashboard

8\. Add multiple credit card profiles

9\. Add multiple offers per card

10\. Merchant database

11\. Merchant search

12\. Create listing

13\. Upload offer evidence

14\. Admin verification

15\. Publish verified offer

16\. View marketplace listings

17\. View pseudonymous user reputation

18\. Stripe $1.99 chat unlock

19\. Private realtime chat

20\. Mark interaction completed

21\. Peer ratings

22\. Block user

23\. Report user

24\. Automatic offer expiration

25\. Admin dashboard

26\. Basic marketplace analytics



\---



**# Explicitly Out of Scope for MVP**



Do not build:



\- mandatory government ID verification

\- bank account linking

\- direct issuer integrations

\- issuer scraping

\- user-to-user payments

\- escrow

\- wallet functionality

\- merchant payment processing

\- cashback settlement

\- crypto

\- complex recommendation engines

\- AI-based matching

\- native iOS application

\- native Android application



\---



**# Mobile UX**



Prioritize mobile usability.



Use:



\- large touch targets

\- bottom navigation

\- full-width cards

\- sticky primary actions

\- responsive dialogs/drawers

\- minimal text density

\- clear reputation indicators



Primary mobile flow:



Search



→ Merchant



→ Offer Listing



→ User Reputation



→ Unlock Chat



→ Message



→ Complete Interaction



→ Rate User



\---



**# Cardholder UX**



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



\---



**# Buyer UX**



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



\---



**# Code Quality Requirements**



Use:



\- TypeScript strict mode

\- reusable components

\- clear domain separation

\- server-side authorization

\- schema validation

\- structured error handling

\- consistent naming

\- accessible UI

\- responsive layouts



Prefer:



\- Zod for validation

\- React Hook Form where appropriate

\- server-side validation for all mutations



Do not trust frontend input.



\---



**# Security Requirements**



Implement:



\- HTTPS only

\- Supabase RLS

\- role-based authorization

\- private storage buckets

\- signed URLs

\- rate limiting where appropriate

\- server-side input validation

\- XSS-safe rendering

\- CSRF-safe patterns

\- secure Stripe webhooks

\- audit logs for admin actions

\- session revocation

\- account suspension



Do not store unnecessary financial information.



\---



**# Privacy Requirements**



Public marketplace data should contain only what is necessary to evaluate:



\- an offer

\- a pseudonymous user's reputation



Cardholder-identifying information must remain private.



Verification evidence must remain private.



Do not leak sensitive data through:



\- public APIs

\- URLs

\- query strings

\- analytics

\- logs

\- metadata

\- image URLs

\- search indexes

\- sitemap files

\- frontend state exposed unnecessarily to the browser



\---



**# Architecture Principle**



Separate data into:



**## Public Marketplace Data**



Safe for authenticated marketplace display.



**## Private User Data**



Visible only to account owner.



**## Sensitive Verification Data**



Visible only to authorized roles.



Do not return full database rows directly to the frontend.



Create explicit DTOs / response models for public data.



Example:



\`PublicOfferDTO\`



should intentionally contain only fields safe for marketplace display.



\---



**# Product Positioning**



Describe the platform as:



**\*\*A pseudonymous peer-to-peer discovery marketplace for verified merchant-specific card offers.\*\***



The central promise is:



**\*\*Find people with relevant merchant offers, verify that the offer exists, connect privately, and use reputation to decide who you trust.\*\***



\---



**# Development Strategy**



Build incrementally.



Recommended order:



1\. Project foundation

2\. Database schema

3\. Supabase Auth

4\. RLS policies

5\. Pseudonymous user profiles

6\. Merchant model

7\. Credit card profile management

8\. Offer creation

9\. Private evidence upload

10\. Admin offer verification

11\. Marketplace search

12\. Listing details

13\. Stripe payment

14\. Conversation unlock

15\. Realtime messaging

16\. Ratings

17\. Reports

18\. Admin moderation

19\. Mobile/PWA polish



Do not attempt to implement every future feature at once.



Before generating large amounts of code, inspect the existing repository and reuse existing architecture, components, conventions, and dependencies whenever appropriate.