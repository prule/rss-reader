## MODIFIED Requirements

### Requirement: Relay restricts what it will fetch

The relay SHALL only fetch `http`/`https` feed URLs and SHALL reject requests that omit a target URL or target a disallowed scheme or address, to avoid acting as an open proxy. Address restrictions SHALL apply to the effective fetch target after any redirects, and SHALL account for encoded forms of internal/private addresses (decimal, hexadecimal, and IPv6 forms), not only their dotted-decimal spelling.

#### Scenario: Missing target rejected

- **WHEN** a relay request omits the target URL
- **THEN** the relay responds with a client error and fetches nothing

#### Scenario: Disallowed target rejected

- **WHEN** a relay request targets a non-http(s) scheme
- **THEN** the relay rejects it without fetching

#### Scenario: Redirect to a disallowed address is not followed

- **WHEN** an allowed target responds with a redirect whose location is a disallowed scheme or a private/internal address
- **THEN** the relay does not fetch that redirect location
- **AND** it responds with an error rather than returning content from the disallowed location

#### Scenario: Encoded private address rejected

- **WHEN** a request (or a redirect location) targets a private/internal address written in an encoded form (e.g. decimal or hexadecimal IP, or an IPv6 loopback/private form)
- **THEN** the relay rejects it without fetching

## ADDED Requirements

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
