# Authentication and Access

## Purpose

Define authentication, account lifecycle, and authorization boundaries for the bill-sharing application.

## Requirements

### Requirement: User authentication

The system SHALL support account registration and sign-in through the configured Auth.js providers, including email/password and optional Google authentication.

#### Scenario: Registered user signs in

- GIVEN an active account with valid credentials
- WHEN the user submits the sign-in form
- THEN the system creates an authenticated session and allows access to authenticated application routes

#### Scenario: Invalid credentials

- GIVEN credentials that do not match an active account
- WHEN the user submits the sign-in form
- THEN the system rejects the sign-in and does not create a session

### Requirement: Account status enforcement

The system SHALL resolve the current user against the database before authorizing protected server pages or APIs. Deleted and suspended accounts MUST NOT be treated as active users.

#### Scenario: Suspended user accesses a protected page

- GIVEN an authenticated session whose account is suspended
- WHEN the user requests an authenticated application page
- THEN the system redirects the user to the suspended-account page

### Requirement: Role and resource authorization

The system SHALL use `User.role` for global roles and bill relationships for resource authorization. Creator and payer SHALL NOT be global user roles.

#### Scenario: Non-admin requests an admin resource

- GIVEN an authenticated user whose role is `USER`
- WHEN the user requests an admin page or admin API
- THEN the system denies access

#### Scenario: User accesses another creator's bill

- GIVEN an authenticated user who is not the bill creator and is not an admin
- WHEN the user requests a creator-only bill operation
- THEN the system denies the request without revealing whether the bill exists

### Requirement: Public bill access

The system SHALL allow a guest to view and pay a published bill through an unguessable public token without requiring an account. Public access MUST NOT expose private creator or account data beyond the payment information required by the flow.

#### Scenario: Guest opens a valid public bill link

- GIVEN a valid public bill token
- WHEN a guest opens the public bill route
- THEN the system displays the bill and participant payment flow without requiring sign-in
