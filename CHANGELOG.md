# Changelog

## 1.2.0 - 2026-07-28

### Added

- Versioned core utilities and Node-based validation tests.
- Release checks for version alignment, static assets, duplicate IDs, and critical security invariants.
- Strict trip title and date validation, including a 90-day planning limit.
- Firestore `createdAt`, `updatedAt`, and `schemaVersion` fields for new trips.
- Visible application version for easier support and release tracking.
- A dedicated Plany browser-tab icon.

### Fixed

- Restored the missing route information map button.
- Prevented repeated Firestore snapshot subscriptions when switching screens.
- Moved map centering until after trip data is available.
- Prevented ordinary trip edits from unexpectedly re-centering the map.
- Hardened Firestore ownership and membership invariants.
- Escaped high-risk user-controlled HTML in primary trip, place, member, checklist, and expense views.

### Preserved

- The previous production source is tagged locally as `v1.1.0-legacy`.
