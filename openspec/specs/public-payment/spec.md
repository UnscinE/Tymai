# Public Payment

## Purpose

Define the guest payment experience exposed through a public bill link.

## Requirements

### Requirement: Participant selection

The public bill page SHALL display the bill summary and allow a guest to select a participant identity from the bill. The selected identity SHALL be persisted locally for convenience and SHALL not be treated as account authentication.

#### Scenario: Guest selects a participant

- GIVEN a valid public bill with participants
- WHEN the guest selects a participant
- THEN the page displays that participant's assigned items, amount due, and payment instructions

### Requirement: Server-derived payment QR

The system SHALL generate payment QR payloads on the server using the bill's snapshotted payee and the selected participant amount. Clients MUST NOT be able to submit an arbitrary amount to generate a payment QR.

#### Scenario: Guest views a payment QR

- GIVEN a selected participant with a positive amount due
- WHEN the payment card loads
- THEN the system requests and displays a QR for the server-derived amount and bill payee

### Requirement: Payment progress feedback

The public page SHALL expose clear idle, reading, scanning, verifying, success, and failed states while a guest submits a payment slip.

#### Scenario: Slip verification is in progress

- GIVEN a guest has selected a participant and chosen an image
- WHEN the client reads or verifies the slip
- THEN the payment controls are disabled and the page communicates that verification is in progress

#### Scenario: Payment succeeds

- GIVEN the server accepts the slip
- WHEN the bill state updates to paid
- THEN the payment section becomes locked and displays a confirmed payment state

#### Scenario: Payment fails

- GIVEN the slip cannot be read, is not valid, or has already been used
- WHEN verification fails
- THEN the page displays the failure reason and allows the guest to retry

#### Scenario: Guest sees the initial payment state

- GIVEN a guest has selected an unpaid participant
- WHEN the payment card is displayed
- THEN the page shows the QR, amount due, and slip upload control

### Requirement: Guest privacy

The client SHALL read the QR payload from the slip locally and SHALL send only the verification payload required by the server. The original slip image MUST NOT be uploaded by the public payment flow.

#### Scenario: Guest submits a slip image

- GIVEN a guest selects a slip image in the public payment flow
- WHEN the client processes the image
- THEN only the decoded verification payload is sent to the server and the original image remains on the client
