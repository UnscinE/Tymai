# Bill Splitting

## Purpose

Define bill creation, item assignment, charge calculation, and immutable published amounts.

## Requirements

### Requirement: Draft bill composition

The system SHALL allow an authenticated creator to build a draft with a title, participants, items, item prices, and item-to-participant assignments.

#### Scenario: Creator adds an item and participants

- GIVEN an authenticated creator editing a draft
- WHEN the creator adds an item and selects one or more participants
- THEN the draft records the item and its participant shares

#### Scenario: Item has no assigned participant

- GIVEN a draft item with no participant assignment
- WHEN the draft summary is displayed
- THEN the system identifies the item as unassigned and excludes its amount from participant totals until assigned

### Requirement: Deterministic monetary calculation

The system SHALL represent monetary values as integer satang and SHALL calculate participant shares using the configured largest-remainder behavior so participant totals reconcile exactly with the bill total.

#### Scenario: Shared item is split between participants

- GIVEN an item assigned to multiple participants
- WHEN the split is calculated
- THEN each participant receives a deterministic integer share and the shares sum to the item price

### Requirement: Bill-level charges

The system SHALL support service percentage, VAT percentage, and a bill-level discount. Charges and discounts SHALL be allocated into participant totals according to the bill calculation rules.

#### Scenario: Creator changes charges in a draft

- GIVEN a draft with assigned items
- WHEN the creator changes service, VAT, or discount values
- THEN the summary recalculates each participant amount and the grand total

### Requirement: Publish freezes payment amounts

When a creator publishes a bill, the system SHALL calculate totals on the server, persist participant amount snapshots, persist the bill total, and transition the bill to `OPEN`. Published amounts MUST NOT change through ordinary draft editing.

#### Scenario: Creator publishes a valid bill

- GIVEN a creator with a configured payee, at least one participant, and at least one assigned item
- WHEN the creator publishes the bill
- THEN the system creates the bill, freezes each participant amount, stores a public token, snapshots payee information, and opens the bill for collection

#### Scenario: Invalid draft cannot be published

- GIVEN a draft without a payee, participant, item, or positive total
- WHEN the creator attempts to publish
- THEN the system rejects publication and leaves the draft unchanged

### Requirement: Bill settlement

The system SHALL transition an open bill to `SETTLED` when all payable participants are paid or waived.

#### Scenario: All participant obligations are complete

- GIVEN an open bill
- WHEN every payable participant becomes paid or waived
- THEN the system marks the bill settled and records the settlement time
