## Purpose

Defines the contract for a stateless relay that fetches feed documents on the client's behalf so the browser can read feeds that do not send permissive CORS headers, without the relay storing any user data.

## Requirements

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

The relay SHALL only fetch `https` feed URLs and SHALL reject requests that omit a target URL or target a disallowed scheme (including plaintext `http`) or address, to avoid acting as an open proxy. Scheme and address restrictions SHALL apply to the effective fetch target after any redirects, and address restrictions SHALL account for encoded forms of internal/private addresses (decimal, hexadecimal, and IPv6 forms), not only their dotted-decimal spelling.

#### Scenario: Missing target rejected

- **WHEN** a relay request omits the target URL
- **THEN** the relay responds with a client error and fetches nothing

#### Scenario: Disallowed target rejected

- **WHEN** a relay request targets a scheme other than `https` (e.g. plaintext `http`, `ftp`, or `file`)
- **THEN** the relay rejects it without fetching

#### Scenario: https target accepted

- **WHEN** a relay request targets a well-formed public `https` feed URL
- **THEN** the relay accepts it for fetching

#### Scenario: Redirect to a disallowed address is not followed

- **WHEN** an allowed target responds with a redirect whose location is a non-https scheme (including `http`) or a private/internal address
- **THEN** the relay does not fetch that redirect location
- **AND** it responds with an error rather than returning content from the disallowed location

#### Scenario: Encoded private address rejected

- **WHEN** a request (or a redirect location) targets a private/internal address written in an encoded form (e.g. decimal or hexadecimal IP, or an IPv6 loopback/private form)
- **THEN** the relay rejects it without fetching

### Requirement: Relay caps response size

The relay SHALL enforce a maximum response size and SHALL stop reading and return an error once an upstream response exceeds that limit, so it cannot be used to transfer arbitrarily large payloads.

#### Scenario: Oversized upstream response is refused

- **WHEN** an upstream feed response exceeds the configured size limit
- **THEN** the relay stops transferring it and responds with an error indicating the response was too large

#### Scenario: Normal feed within the limit succeeds

- **WHEN** an upstream feed response is within the configured size limit
- **THEN** the relay returns it as usual

### Requirement: Relay limits request rate

The relay SHALL limit how many requests a single client may make within a time window, and SHALL reject requests over that limit with a rate-limit error, so one caller cannot exhaust the account's quota or run sustained abuse.

#### Scenario: Requests over the limit are rejected

- **WHEN** a client exceeds the configured request rate
- **THEN** further requests from that client are rejected with a rate-limit status until the window resets

#### Scenario: Requests within the limit succeed

- **WHEN** a client stays within the configured request rate
- **THEN** its requests are served normally

### Requirement: Relay restricts calling origins

For browser-originated requests, the relay SHALL only serve requests whose `Origin` is on a configured allowlist (the app's deployed domain(s) and local development), and SHALL reject other browser origins. This is a defense-in-depth measure and does not replace the size, rate, and target restrictions.

#### Scenario: Allowed origin is served

- **WHEN** a browser request arrives with an `Origin` on the allowlist
- **THEN** the relay serves it and returns CORS headers permitting that origin

#### Scenario: Disallowed browser origin is rejected

- **WHEN** a browser request arrives with an `Origin` that is not on the allowlist
- **THEN** the relay rejects the request

### Requirement: Relay only relays feed-like content

The relay SHALL only return responses whose content type is feed-like (RSS/Atom/XML or text), and SHALL reject other content types, so it cannot be used as a general-purpose content proxy.

#### Scenario: Non-feed content type is rejected

- **WHEN** an upstream response has a content type that is not feed-like (e.g. an image or binary download)
- **THEN** the relay rejects it with an error rather than returning the body

#### Scenario: Feed content type is relayed

- **WHEN** an upstream response is served as RSS, Atom, XML, or text
- **THEN** the relay returns it to the caller
