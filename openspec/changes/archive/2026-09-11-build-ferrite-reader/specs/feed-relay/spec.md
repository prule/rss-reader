## Purpose

Defines the contract for a stateless relay that fetches feed documents on the client's behalf so the browser can read feeds that do not send permissive CORS headers, without the relay storing any user data.

## ADDED Requirements

### Requirement: Relay fetches a feed on request

The relay SHALL accept a request naming a single target feed URL, fetch that URL server-side, and return the feed document's bytes to the caller with response headers that permit the browser app to read them.

#### Scenario: Successful relay

- **WHEN** the app requests the relay with a valid feed URL
- **THEN** the relay fetches that URL and returns its body
- **AND** the response is readable by the browser app (cross-origin access permitted)
- **AND** the upstream content type is preserved or reported

#### Scenario: Upstream error is reported, not masked

- **WHEN** the target URL returns an error status or is unreachable
- **THEN** the relay responds with an error the app can distinguish from a parse failure

### Requirement: Relay is stateless and stores no user data

The relay MUST NOT persist feed URLs, feed content, user identifiers, or any request data beyond what is required to serve the single in-flight request. It holds no account or library state.

#### Scenario: No retained state

- **WHEN** any relay request completes
- **THEN** no user data or feed content is written to durable storage by the relay

### Requirement: Relay restricts what it will fetch

The relay SHALL only fetch `http`/`https` feed URLs and SHALL reject requests that omit a target URL or target a disallowed scheme or address, to avoid acting as an open proxy.

#### Scenario: Missing target rejected

- **WHEN** a relay request omits the target URL
- **THEN** the relay responds with a client error and fetches nothing

#### Scenario: Disallowed target rejected

- **WHEN** a relay request targets a non-http(s) scheme
- **THEN** the relay rejects it without fetching
