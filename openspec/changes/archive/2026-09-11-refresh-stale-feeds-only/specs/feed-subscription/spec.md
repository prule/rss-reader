## MODIFIED Requirements

### Requirement: Refresh feeds

The system SHALL refresh feeds automatically on a recurring interval and SHALL allow the user to trigger a refresh manually. A refresh failure for one feed MUST NOT prevent other feeds from refreshing.

Automatic refresh SHALL only fetch a feed whose last successful fetch was more than 24 hours ago, or which has never been successfully fetched; feeds fetched within the last 24 hours SHALL be skipped. A manual refresh SHALL fetch all feeds regardless of age. The system SHALL record the time of each feed's last successful fetch and MUST NOT advance it when a fetch fails, so a failed feed remains eligible for the next automatic refresh.

#### Scenario: Automatic polling

- **WHEN** the app has been open past the refresh interval
- **THEN** subscribed feeds whose last successful fetch was more than 24 hours ago are re-fetched and new entries appear without user action

#### Scenario: Fresh feeds are skipped on automatic refresh

- **WHEN** an automatic refresh runs and a feed was successfully fetched within the last 24 hours
- **THEN** that feed is not fetched again

#### Scenario: Manual refresh forces all feeds

- **WHEN** the user triggers a manual refresh
- **THEN** every feed is fetched regardless of when it was last fetched

#### Scenario: A failed fetch stays eligible

- **WHEN** a feed's fetch fails
- **THEN** its last-successful-fetch time is not updated
- **AND** the next automatic refresh still treats it as stale and retries it

#### Scenario: One feed failing does not block others

- **WHEN** a refresh is triggered and one feed's fetch fails
- **THEN** the remaining feeds still refresh
