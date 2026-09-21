## Purpose

Keeps the entire library on the device across sessions and lets the user back it up and restore it via file export and import, so no server or account is required to own one's data.

## Requirements

### Requirement: Local persistence of the library

The system SHALL persist the full library — feed/folder nodes and entries, including read, bookmark, and collapsed state — to a local on-device database, and SHALL restore it on next launch. All changes (subscribe, move, rename, delete, read, bookmark, refresh) SHALL be persisted.

Persisting a change SHALL cost in proportion to what changed, not to the size of the library: changing one entry's read or bookmark state MUST NOT require rewriting unrelated entries. The library SHALL remain usable beyond the few megabytes a single serialised string can hold; the practical limit SHALL be the browser's storage quota for the origin rather than a fixed string ceiling.

A single user action that changes several records (deleting a feed and its entries, reparenting a folder's children, importing a library) SHALL be persisted atomically: either all of its records are written or none are, so an interrupted write cannot leave a partially deleted feed or a half-imported library.

#### Scenario: State survives reload

- **WHEN** the user reloads the app after making changes
- **THEN** the tree, entries, and their read/bookmark/collapsed state are restored as they were

#### Scenario: First run with no stored data

- **WHEN** the app starts and no library is stored
- **THEN** it starts from an empty library without error

#### Scenario: Storage is unavailable or full

- **WHEN** persisting fails (storage full or blocked)
- **THEN** the app keeps running against whatever it has already loaded and surfaces a warning suggesting a backup export
- **AND** the failed action is reported rather than silently appearing to have succeeded

#### Scenario: Toggling one entry does not rewrite the library

- **WHEN** the user toggles read or bookmark state on a single entry in a large library
- **THEN** only that entry's stored record is written

#### Scenario: A multi-record change is all-or-nothing

- **WHEN** a change that touches several records is interrupted part-way
- **THEN** the stored library reflects either the complete change or none of it, never a partial one

### Requirement: Versioned data with migration

The local database SHALL carry a schema version. Schema upgrades SHALL be forward-only: when the app opens a database written by an earlier version of itself, it SHALL upgrade that database in place to the current schema rather than discarding it, preserving existing read and bookmark state.

The system SHALL NOT migrate a library saved by a version that persisted to a single serialised browser-storage string. Such a payload SHALL NOT be loaded into the library; the app SHALL start from an empty library and the user SHALL restore from an export (see _Rescue of a pre-database library_). This is a deliberate one-time break, taken instead of carrying migration code for that format.

#### Scenario: Older payload is migrated

- **WHEN** the app opens a local database written by an earlier version of the app
- **THEN** it is upgraded to the current schema in place and no user state is lost
- **AND** read and bookmark state on existing entries is preserved

#### Scenario: A newer database is not silently downgraded

- **WHEN** the app opens a local database written by a _newer_ version of the app
- **THEN** it does not destroy or rewrite that data, and reports that the stored library was written by a newer version

#### Scenario: A pre-database payload is not loaded

- **WHEN** the app starts and finds a library in the old single-string browser-storage format
- **THEN** that payload is not loaded into the library and the app starts empty

### Requirement: Export the library

The system SHALL export the full library as a JSON file and SHALL export entries with their resolved feed, folder path, tags, and read/bookmark state as a CSV file. Exports download to the device.

#### Scenario: JSON export

- **WHEN** the user exports JSON
- **THEN** a JSON file containing all nodes and entries downloads

#### Scenario: CSV export

- **WHEN** the user exports CSV
- **THEN** a CSV downloads with one row per entry including feed, folder path, tags, read, and bookmarked columns

### Requirement: Import a library

The system SHALL restore a library from a previously exported JSON file and SHALL reconstruct folders, feeds, and entries from a CSV export (rebuilding the folder hierarchy from each row's folder path). An import that cannot be read SHALL leave the current library unchanged and report the failure.

#### Scenario: JSON import replaces library

- **WHEN** the user imports a valid JSON export
- **THEN** the library is replaced by its contents and the selection resets

#### Scenario: CSV import rebuilds hierarchy

- **WHEN** the user imports a CSV export
- **THEN** folders are recreated from the folder-path column and entries are attached to the right feeds

#### Scenario: Unreadable file is safe

- **WHEN** the chosen file cannot be parsed
- **THEN** the current library is left intact and the failure is reported

### Requirement: Asynchronous startup

Opening the local database SHALL be asynchronous. Until it is open, the system SHALL show that the library is loading rather than presenting an empty library as if it were the user's own. If the database cannot be opened at all, the system SHALL say so and remain usable for reading nothing — it MUST NOT hang on a spinner indefinitely and MUST NOT appear to have lost data it has not read yet.

#### Scenario: Loading state precedes the library

- **WHEN** the app is launched and the local database has not finished opening
- **THEN** the interface indicates that the library is loading
- **AND** it does not show "no feeds yet" empty states for a library it has not read

#### Scenario: Database cannot be opened

- **WHEN** the local database cannot be opened (blocked, unsupported, or corrupt)
- **THEN** the app reports that local storage is unavailable and suggests importing a backup
- **AND** the interface remains responsive rather than stalling on a loading state

### Requirement: Recovery from an evicted store

The system SHALL treat eviction of its local database as a normal condition. When the database is found missing or empty, the app SHALL start from an empty library without error and SHALL NOT present the loss as a crash or an unavailable store.

The system is NOT required to report that an eviction happened, because it cannot detect one. Browsers evict a whole origin: IndexedDB, localStorage, Cache Storage and cookies are removed together, so no marker can survive to distinguish an evicted library from a first run. The two states are identical on the next launch. Any requirement to report the loss would be unimplementable, so recovery is specified as a silent, clean start instead. Reducing the likelihood of eviction — for example by requesting persistent storage — is a separate concern and is not specified here.

#### Scenario: Store was evicted between sessions

- **WHEN** the browser has evicted the app's local database and the user launches the app
- **THEN** the app starts from an empty library and remains fully usable
- **AND** it does not report an error or an unavailable store

### Requirement: Rescue of a pre-database library

When, on startup, the system finds a library in the old single serialised-string format, it SHALL offer the user a one-time download of that payload as a JSON file in the same format the JSON export produces — so it can be restored through the normal import path. Once the user has taken the download or declined it, the old payload SHALL be removed and SHALL NOT be offered again. After this change the system SHALL NOT write to that browser-storage key at all.

#### Scenario: Legacy payload is offered as a download

- **WHEN** the app starts and finds a library in the old single-string format
- **THEN** the user is offered a one-time download of it as a JSON file importable by the normal JSON import

#### Scenario: Offer is not repeated

- **WHEN** the user has downloaded or declined that offer and reloads the app
- **THEN** the old payload has been removed and the offer is not shown again

#### Scenario: Rescued file round-trips through import

- **WHEN** the user imports the rescued JSON file
- **THEN** the library is restored with its nodes, entries, and read/bookmark state intact

### Requirement: Import replaces the library atomically

Importing a library SHALL replace the stored library in a single atomic operation. A failed or interrupted import SHALL leave the previously stored library exactly as it was.

#### Scenario: Interrupted import leaves the library intact

- **WHEN** an import fails part-way through writing
- **THEN** the previously stored library is unchanged and the failure is reported
