## MODIFIED Requirements

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
