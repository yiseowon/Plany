# Changelog

## 2.1.0 - 2026-07-28

### Fixed

- Newly added places now move immediately into chronological order instead of always remaining at the bottom.
- Editing a place time also re-sorts the day and redraws the route.
- Tablet-sized windows keep the planner and map side by side instead of unexpectedly dropping the map below the entire planner.

### Added

- Transit lookup now uses the selected trip day and the origin place time when the date is in the future.
- Route details now parse vehicle type, bus/train line number, full line name, headsign, trip number, boarding and arrival stops, stop coordinates, departure and arrival times, stop count, headway, agency, transfers, distance, warnings, and real fare when Google supplies it.
- Boarding and arrival stops link directly to their exact Google Maps coordinates.
- A route-specific Google Maps directions button replaces the unrelated ticket search.
- Focused unit tests cover chronological ordering, trip-date calculation, past-time fallback, and transit response parsing.

### Improved

- Rebuilt the route sheet with a compact summary, visual journey timeline, alternative driving/walking cards, official warnings, and responsive mobile layout.
- Removed the hard-coded yen taxi estimate; Plany now avoids presenting fabricated local prices.
- The planner header now shows the selected date and destination, and the internal tabs use clearer icons.
- On phones, the live map moves directly below the trip header and above the planning controls.

### Technical note

- Route calculation now prefers the modern Google Maps JavaScript `Route.computeRoutes` API. If the Routes API is not enabled for the configured Google Cloud project, Plany automatically falls back to the existing `DirectionsService` adapter so route drawing and detail sheets continue to work.

## 2.0.0 - 2026-07-28

### Added

- A completely redesigned public landing page with a clear product story, feature overview, and original travel planning guide.
- Versioned first-use agreement for the terms and privacy policy, recorded both locally and in the signed-in user document.
- Draft service terms, privacy policy, and advertising/cookie notice for pre-launch legal review.
- A large iPhone-style time picker with quick time presets and five-minute controls.
- AdSense-ready ad containers and a guarded loader that stays entirely disabled until valid publisher and slot IDs are configured.
- A privacy and advertising settings panel that clearly reports the current no-ad state.

### Improved

- Renamed ambiguous date shortcuts to “오늘부터 3박 4일” and “오늘부터 일주일”.
- Added visible cancel or close actions to every major dialog.
- Standardized Escape-key and backdrop dismissal for non-blocking dialogs.
- Made consent and new-profile cancellation end the sign-in flow instead of trapping the user.

### Safety

- No live advertising script, cookie, or publisher identifier ships in the default configuration.
- Agreement history is stored outside shared profile documents under owner-only Firestore rules.
- Legal pages remain explicitly marked as drafts until operator and privacy-contact details are supplied and reviewed.

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
