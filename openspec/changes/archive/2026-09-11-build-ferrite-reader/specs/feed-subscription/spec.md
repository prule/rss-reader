## Purpose

Lets a user subscribe to RSS/Atom feeds by URL and keeps each feed's entries current by fetching, parsing, normalizing, and deduplicating items on an ongoing basis.

## ADDED Requirements

### Requirement: Add a feed by URL

The system SHALL allow a user to subscribe to a feed by providing its URL, with an optional display title and an optional target folder. When no title is provided, the system SHALL derive one from the feed document, falling back to the feed's host name.

#### Scenario: Subscribe with URL only

- **WHEN** the user submits a feed URL with no title
- **THEN** a new feed node is created at the chosen location (top level if none chosen)
- **AND** its title is taken from the fetched feed's title, or the URL host if the feed provides none

#### Scenario: Subscribe with an explicit title and folder

- **WHEN** the user submits a URL, a title, and selects an existing folder
- **THEN** the feed node is created inside that folder with the given title

#### Scenario: Empty submission is ignored

- **WHEN** the user submits the add-feed form with neither a URL nor a title
- **THEN** no feed is created and the form closes

### Requirement: Fetch and parse feed content

The system SHALL fetch each subscribed feed's document and parse both RSS and Atom formats into a common entry shape: title, author, link, published timestamp, a stable item identity, a plain-text snippet, and a sanitized body.

#### Scenario: RSS and Atom both parse

- **WHEN** a fetched document is valid RSS 2.0 or Atom 1.0
- **THEN** its items are converted into entries with title, link, author, and published timestamp populated where the source provides them

#### Scenario: Timestamps are absolute

- **WHEN** an item provides a publish or updated date
- **THEN** the entry stores an absolute timestamp
- **AND** the relative "time ago" shown in the UI is computed from that timestamp at display time

#### Scenario: Malformed feed is rejected without data loss

- **WHEN** a fetched document cannot be parsed as RSS or Atom
- **THEN** no entries are added or removed for that feed
- **AND** the failure is surfaced to the user via the status/toast area

### Requirement: Deduplicate entries across refreshes

The system SHALL identify each item by a stable identity (the item's guid/id, or its link, or a content hash when neither is present) and MUST NOT create duplicate entries for an item already stored for that feed.

#### Scenario: Re-fetch does not duplicate

- **WHEN** a feed is refreshed and returns items already stored
- **THEN** those items do not produce new entries
- **AND** their existing read and bookmark state is preserved

#### Scenario: New items are appended

- **WHEN** a refresh returns items not previously seen for the feed
- **THEN** new unread entries are created for them

### Requirement: Refresh feeds

The system SHALL refresh feeds automatically on a recurring interval and SHALL allow the user to trigger a refresh manually. A refresh failure for one feed MUST NOT prevent other feeds from refreshing.

#### Scenario: Automatic polling

- **WHEN** the app has been open past the refresh interval
- **THEN** subscribed feeds are re-fetched and new entries appear without user action

#### Scenario: One feed failing does not block others

- **WHEN** a refresh is triggered and one feed's fetch fails
- **THEN** the remaining feeds still refresh
- **AND** the failed feed reports its error without discarding its existing entries
