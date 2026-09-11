## Purpose

Presents feed entries for reading — the middle entry list and the article pane — driven by the current library selection, with read/unread tracking and keyboard navigation.

## ADDED Requirements

### Requirement: Selecting a node aggregates entries beneath it

The system SHALL show, for the selected tree node, all entries belonging to any feed at or below that node. Selecting a feed shows that feed's entries; selecting a folder shows the entries of every feed nested under it, recursively.

#### Scenario: Folder aggregates descendant feeds

- **WHEN** the user selects a folder containing multiple feeds and subfolders
- **THEN** the entry list shows entries from every feed under that folder

#### Scenario: Feed shows its own entries

- **WHEN** the user selects a single feed
- **THEN** the entry list shows only that feed's entries

### Requirement: Library views

The system SHALL provide All Entries, Unread, and Bookmarks views. All Entries shows every entry; Unread shows only entries not marked read; Bookmarks shows only bookmarked entries. Each view SHALL display a count.

#### Scenario: Unread view filters read entries

- **WHEN** the user selects Unread
- **THEN** only entries not marked read are listed

#### Scenario: Counts reflect state

- **WHEN** entries change read or bookmark state
- **THEN** the All / Unread / Bookmarks counts update accordingly

### Requirement: Read/unread state

The system SHALL mark an entry read when it is opened, SHALL allow toggling an entry between read and unread, and SHALL provide a "mark all read" action that marks every entry in the current list read. Unread entries SHALL be visually distinguished from read ones.

#### Scenario: Opening marks read

- **WHEN** the user opens an entry
- **THEN** it becomes read and its unread indicator clears

#### Scenario: Toggle unread

- **WHEN** the user toggles read state on an entry
- **THEN** its state flips and its indicator updates

#### Scenario: Mark all read

- **WHEN** the user invokes "mark all read" on the current list
- **THEN** every entry currently listed becomes read

### Requirement: Article reading pane

The system SHALL display the selected entry's title, source feed, byline (author and time), any hierarchy tags, and its sanitized body. When no entry is selected, the pane SHALL show an empty state. Entry body content MUST be sanitized before rendering.

#### Scenario: Render selected entry

- **WHEN** an entry is selected
- **THEN** the reading pane shows its title, feed, byline, tags, and body

#### Scenario: Empty state

- **WHEN** no entry is selected
- **THEN** the reading pane shows a "select an entry" placeholder

#### Scenario: Untrusted markup is neutralized

- **WHEN** an entry body contains scripts or unsafe markup
- **THEN** the rendered article contains no executable or unsafe content

### Requirement: Keyboard navigation

The system SHALL support keyboard shortcuts when focus is not in a text field: J/K move to the next/previous entry (opening it and marking it read), B toggles the selected entry's bookmark, U toggles its read state, N opens the add-feed dialog, and `/` switches to Bookmarks and focuses the search field. Escape SHALL close an open dialog or inline edit.

#### Scenario: J/K move and open

- **WHEN** the user presses J or K outside a text field
- **THEN** the selection moves to the next or previous entry and that entry opens

#### Scenario: Shortcuts inert while typing

- **WHEN** focus is in an input, select, or textarea
- **THEN** letter shortcuts do not fire, and Escape leaves the field
