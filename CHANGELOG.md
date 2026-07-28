# Changelog

## 1.3.0 - 2026-07-28

### Added

- A large custom date-range calendar instead of the browser's compact native date input.
- Clear start, end, and in-range states with Korean date labels.
- Quick presets for today, this weekend, three nights/four days, and one week.
- An iPhone-style bottom sheet layout on small screens.
- Keyboard escape, backdrop close, and accessible calendar labels.

### Improved

- Date errors and the 90-day limit are now explained during selection, before form submission.
- Create and settings forms share the same date-range experience without changing stored ISO dates.

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
