# Slip Verification

## Purpose

Define client-side slip decoding, server-side verification, duplicate prevention, and payment recording.

## Requirements

### Requirement: Local QR decoding

The system SHALL attempt to decode a payment QR from a user-selected image on the client using the supported decoder fallbacks. It SHALL distinguish an unreadable image or missing QR from a server verification failure.

#### Scenario: Image contains no readable QR

- GIVEN a guest selects an image without a decodable payment QR
- WHEN local decoding completes
- THEN the system reports a no-QR failure without sending the image to the server

### Requirement: Slip payload verification

The server SHALL validate that the decoded payload represents a supported transfer slip before recording payment. The system SHALL support anti-duplicate verification and preserve a verification level for each payment.

#### Scenario: Valid new slip payload

- GIVEN a payload that represents a supported transfer slip and has not been used
- WHEN the server verifies it for a participant
- THEN the system records a payment, marks the participant paid, and returns the updated bill

#### Scenario: Unsupported payload

- GIVEN a decoded payload that is not a supported transfer slip
- WHEN the server verifies it
- THEN the system rejects the payment and returns a failure reason without marking the participant paid

### Requirement: Global duplicate prevention

The system SHALL prevent one slip fingerprint from being recorded more than once across all bills using a database uniqueness constraint or equivalent atomic guarantee.

#### Scenario: Same slip is submitted twice

- GIVEN a slip fingerprint already associated with a verified payment
- WHEN another participant submits the same fingerprint
- THEN the second submission is rejected as a duplicate and does not alter payment state

### Requirement: Manual payment verification

The bill creator or an authorized admin SHALL be able to mark a participant paid manually, including offline payments, and SHALL be able to reverse that status when appropriate.

#### Scenario: Creator manually approves payment

- GIVEN the creator has independently confirmed a payment
- WHEN the creator marks the participant paid
- THEN the participant becomes paid, the action is recorded as manual verification, and an audit event is written
