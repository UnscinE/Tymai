# Friends and History

## Purpose

Define friend relationships, linked participants, and bill history views.

## Requirements

### Requirement: Friend relationships

The system SHALL support directed friend requests with pending, accepted, and blocked states while storing one relationship row per requester/addressee pair.

#### Scenario: User accepts a friend request

- GIVEN a pending incoming request
- WHEN the recipient accepts it
- THEN the relationship becomes accepted and both users can use the relationship where permitted

#### Scenario: User blocks a relationship

- GIVEN an existing friend relationship or request
- WHEN a user blocks it
- THEN the relationship becomes blocked and cannot be used for ordinary friend selection

### Requirement: Safe friend search

The system SHALL support exact friend search by the configured identifiers and SHALL return only the minimum public identity fields needed for selection. Search results MUST NOT expose private email or phone data unnecessarily.

#### Scenario: User searches for a friend

- GIVEN an authenticated user enters an exact supported identifier
- WHEN the search request completes
- THEN the system returns only eligible public identity fields for matching users

### Requirement: Linked bill participants

A creator MAY link a bill participant to the creator, or to an accepted friend. The server SHALL re-check linkable user IDs and MUST ignore or nullify unauthorized IDs supplied by a client.

#### Scenario: Client submits an unrelated user ID

- GIVEN a bill draft containing a user ID that is not the creator or an accepted friend
- WHEN the server creates the bill
- THEN the participant is not linked to that unrelated account

### Requirement: Bill history

The system SHALL provide authenticated users with history views that distinguish bills they created from bills they need to pay and support filtering by relevant bill status or role.

#### Scenario: User filters bill history

- GIVEN an authenticated user with created and payable bills
- WHEN the user selects a history filter
- THEN the system displays only bills matching the selected relationship or status
