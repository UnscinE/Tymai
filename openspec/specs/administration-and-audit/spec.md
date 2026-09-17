# Administration and Audit

## Purpose

Define administrator capabilities and immutable audit records for sensitive account and payment actions.

## Requirements

### Requirement: Administrator access

The system SHALL restrict administrator pages and APIs to users with `User.role = ADMIN`. Authorization SHALL be enforced both at the route boundary and inside sensitive handlers.

#### Scenario: Admin opens the admin area

- GIVEN an authenticated active administrator
- WHEN the administrator requests an admin route
- THEN the system permits access to the relevant dashboard or management page

#### Scenario: Ordinary user requests an admin API

- GIVEN an authenticated user with role `USER`
- WHEN the user calls an admin API directly
- THEN the API returns a forbidden response and performs no mutation

### Requirement: User administration

Authorized administrators SHALL be able to inspect users and suspend or restore account access. User deletion SHALL preserve references needed for historical bills and audit records through soft-delete behavior.

#### Scenario: Administrator suspends a user

- GIVEN an active administrator and an active user account
- WHEN the administrator suspends the user
- THEN the account becomes suspended and protected access is denied

### Requirement: Bill and payment oversight

Authorized administrators SHALL be able to inspect bills and payment states across the application for support, dispute handling, and operational monitoring.

#### Scenario: Administrator inspects payment activity

- GIVEN an authenticated administrator
- WHEN the administrator opens the bill or payment overview
- THEN the system displays bill and payment states across the authorized scope

### Requirement: Immutable audit trail

The system SHALL write append-only audit records for security-sensitive actions, including bill publication, payment verification changes, account suspension, and related administrative mutations. Audit records SHALL identify the actor when available, entity, action, timestamp, and relevant metadata.

#### Scenario: Sensitive state changes

- GIVEN an authorized actor changes payment or account state
- WHEN the mutation succeeds
- THEN the system writes an audit record describing the action and target entity

#### Scenario: Audit records are viewed

- GIVEN an authorized administrator
- WHEN the administrator opens the audit view
- THEN the system displays audit records without allowing ordinary edits or deletion
