## Purpose

Lets users bookmark individual entries, automatically tags each bookmark with its feed's place in the hierarchy, and makes the bookmark collection searchable by keyword and by those tags.

## Requirements

### Requirement: Bookmark an entry

The system SHALL allow the user to bookmark and un-bookmark any entry from the entry list and from the article pane. Bookmark state SHALL persist and SHALL be reflected consistently everywhere the entry appears.

#### Scenario: Toggle bookmark

- **WHEN** the user bookmarks an entry
- **THEN** it appears in the Bookmarks view and shows as bookmarked in every list and in the article pane

#### Scenario: Un-bookmark

- **WHEN** the user removes a bookmark
- **THEN** the entry leaves the Bookmarks view and its bookmark indicators clear

### Requirement: Bookmarks are tagged with their hierarchy path

The system SHALL derive a bookmark's tags from its feed's position in the tree: each ancestor folder name plus the feed's own name. When the feed is moved in the tree, the tags derived for its bookmarks SHALL reflect the new path.

#### Scenario: Tags follow the path

- **WHEN** an entry belongs to a feed nested as Technology / Infrastructure / Packet Loss Weekly
- **THEN** its bookmark carries the tags "Technology", "Infrastructure", and "Packet Loss Weekly"

#### Scenario: Moving the feed re-derives tags

- **WHEN** the feed is moved to a different folder
- **THEN** its bookmarks' tags reflect the new hierarchy path

### Requirement: Search bookmarks by keyword and tags

In the Bookmarks view the system SHALL let the user filter bookmarks by a keyword query and by selecting tag chips. The keyword query SHALL match against entry title, snippet, and tags. Selecting multiple tag chips SHALL narrow results to bookmarks carrying all selected tags (AND). Keyword and tag filters SHALL combine (both must match). Only tags present on current bookmarks SHALL be offered as chips.

#### Scenario: Keyword filter

- **WHEN** the user types a keyword in the bookmark search
- **THEN** only bookmarks whose title, snippet, or tags contain that keyword are shown

#### Scenario: Multiple tags are AND-combined

- **WHEN** the user selects two tag chips
- **THEN** only bookmarks carrying both tags are shown

#### Scenario: Keyword and tags combine

- **WHEN** the user has both a keyword and one or more tags active
- **THEN** only bookmarks matching the keyword and carrying all selected tags are shown

#### Scenario: No matches

- **WHEN** no bookmark matches the active keyword and tags
- **THEN** an empty state explains that no bookmarks match
