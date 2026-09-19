## ADDED Requirements

### Requirement: Discover feeds from a site URL

The system SHALL let a user enter a web page URL (not necessarily a feed) and discover the feeds published by that page, presenting the discovered feeds for the user to choose from before any subscription is created. Discovery MUST NOT create feed nodes or persist anything on its own; only an explicit add action creates subscriptions.

#### Scenario: Site URL reveals its feeds

- **WHEN** the user submits a URL that is a web page advertising one or more feeds
- **THEN** the system presents the discovered feeds, each identified by a display title and feed type
- **AND** no feed node is created until the user confirms a selection

#### Scenario: Entered URL is already a feed

- **WHEN** the user submits a URL that is itself a valid feed document
- **THEN** the system subscribes to it directly without a selection step, as with a plain add-by-URL

#### Scenario: No feeds discovered

- **WHEN** the user submits a page URL and no feeds can be discovered from it
- **THEN** the system tells the user none were found
- **AND** the user can still choose to add the entered URL as a feed as-is

#### Scenario: Discovery fails or is offline

- **WHEN** discovery cannot reach the page (network unavailable or the page errors)
- **THEN** the failure is surfaced via the status/toast area
- **AND** no feed node is created

### Requirement: Select and add discovered feeds

When feeds have been discovered, the system SHALL let the user select any subset of them and add the selected feeds in one action, choosing a single target folder for the batch (top level if none chosen). Each added feed SHALL be created through the ordinary subscribe path, so its title is filled from the fetched feed when available and its entries are fetched, parsed, and deduplicated as for any subscription.

#### Scenario: Add a subset to a folder

- **WHEN** the user selects some of the discovered feeds, chooses a folder, and confirms
- **THEN** a feed node is created for each selected feed inside that folder
- **AND** feeds left unselected are not added

#### Scenario: Discovered title seeds the feed, real title wins on fetch

- **WHEN** a selected feed is added
- **THEN** its node is created using the discovered title as an initial name
- **AND** the title derived from the fetched feed document replaces it where the feed provides one, falling back to the feed's host name
