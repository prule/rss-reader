## ADDED Requirements

### Requirement: Relay discovers feeds in a page

The relay SHALL provide a discovery mode that accepts a single target page URL, fetches that page server-side, and returns only the feeds discovered in it as a constrained list — each entry limited to a feed URL, a feed type, and a short display title. The relay MUST NOT return the fetched page body in the discovery response; the raw page never leaves the relay. Each discovery request SHALL cause at most one upstream fetch (the page itself): the relay MUST NOT fetch or probe the discovered candidate feeds, so a discovery request cannot amplify into many upstream requests.

#### Scenario: Discovered feeds are returned as a constrained list

- **WHEN** the app sends a discovery request for a page that advertises feeds
- **THEN** the relay returns a list in which each item carries a feed URL, a feed type, and a short title, and nothing more
- **AND** the fetched page's body is not included in the response

#### Scenario: Page with no feeds

- **WHEN** a discovery request targets a page that advertises no feeds
- **THEN** the relay returns an empty discovery list rather than an error

#### Scenario: Discovery performs a single upstream fetch

- **WHEN** the relay handles a discovery request
- **THEN** it fetches only the target page
- **AND** it does not fetch or probe any of the feed URLs it discovers

#### Scenario: Discovered feed URLs are absolute and https

- **WHEN** a page advertises a feed via a relative or non-https reference
- **THEN** the relay resolves it against the page URL and includes it only if the effective feed URL is an allowed `https` target
- **AND** references that resolve to a disallowed scheme or a private/internal address are omitted

## MODIFIED Requirements

### Requirement: Relay restricts what it will fetch

The relay SHALL only fetch `https` URLs and SHALL reject requests that omit a target URL or target a disallowed scheme (including plaintext `http`) or address, to avoid acting as an open proxy. Scheme and address restrictions SHALL apply to the effective fetch target after any redirects, and address restrictions SHALL account for encoded forms of internal/private addresses (decimal, hexadecimal, and IPv6 forms), not only their dotted-decimal spelling.

The relay's ordinary feed-fetch response SHALL only relay feed-like content. The discovery mode is the sole exception to the feed-like-content restriction: it MAY fetch an `https` page that is not itself a feed, but only so it can extract feed references from it, and it SHALL return only the constrained discovered-feed list — never the fetched page's body. All other restrictions (scheme, address, redirect re-validation, size cap, rate limit, statelessness) apply to the discovery mode's fetch exactly as to a feed fetch.

#### Scenario: Missing target rejected

- **WHEN** a relay request omits the target URL
- **THEN** the relay responds with a client error and fetches nothing

#### Scenario: Disallowed target rejected

- **WHEN** a relay request targets a scheme other than `https` (e.g. plaintext `http`, `ftp`, or `file`)
- **THEN** the relay rejects it without fetching

#### Scenario: https target accepted

- **WHEN** a relay request targets a well-formed public `https` URL
- **THEN** the relay accepts it for fetching

#### Scenario: Redirect to a disallowed address is not followed

- **WHEN** an allowed target responds with a redirect whose location is a non-https scheme (including `http`) or a private/internal address
- **THEN** the relay does not fetch that redirect location
- **AND** it responds with an error rather than returning content from the disallowed location

#### Scenario: Encoded private address rejected

- **WHEN** a request (or a redirect location) targets a private/internal address written in an encoded form (e.g. decimal or hexadecimal IP, or an IPv6 loopback/private form)
- **THEN** the relay rejects it without fetching

#### Scenario: Non-feed content relayed only in discovery mode

- **WHEN** an ordinary feed-fetch request receives a response that is not feed-like
- **THEN** the relay refuses to relay it
- **AND** a discovery request MAY fetch a non-feed `https` page but returns only the discovered-feed list, never the page body
