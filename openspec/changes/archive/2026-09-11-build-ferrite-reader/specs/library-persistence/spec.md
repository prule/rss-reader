## Purpose

Keeps the entire library on the device across sessions and lets the user back it up and restore it via file export and import, so no server or account is required to own one's data.

## ADDED Requirements

### Requirement: Local persistence of the library

The system SHALL persist the full library — feed/folder nodes and entries, including read, bookmark, and collapsed state — to the device's local storage, and SHALL restore it on next launch. All changes (subscribe, move, rename, delete, read, bookmark, refresh) SHALL be persisted.

#### Scenario: State survives reload

- **WHEN** the user reloads the app after making changes
- **THEN** the tree, entries, and their read/bookmark/collapsed state are restored as they were

#### Scenario: First run with no stored data

- **WHEN** the app starts and no library is stored
- **THEN** it starts from an empty library without error

#### Scenario: Storage is unavailable or full

- **WHEN** persisting fails (storage full or blocked)
- **THEN** the app keeps running with in-memory state and surfaces a warning suggesting a backup export

### Requirement: Versioned data with migration

The stored payload SHALL carry a schema version. On load, the system SHALL upgrade an older payload to the current shape rather than discarding it, preserving existing read and bookmark state.

#### Scenario: Older payload is migrated

- **WHEN** the app loads a library saved by an earlier version
- **THEN** it is migrated to the current shape and no user state is lost

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
