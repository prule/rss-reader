# Time, Money & Localization

Three data-handling rules that are cheap to follow from the start and corrupt data when they are not.

## Time — store UTC, format at the edge
- **Every timestamp is stored in UTC**, and APIs return ISO-8601 with an offset (`2026-06-27T17:33:34Z`).
- Only the presentation layer converts to local time, with `Intl.DateTimeFormat` or `date-fns`.
- Never store a local time without its zone, and never infer the zone from the server's clock.
- A *date* with no time (a birthday, an invoice date) is a date, not a midnight timestamp. Storing it as one moves it across the date line for someone.
- For a future appointment, store the **IANA zone** (`Europe/London`) alongside the instant — offsets change when governments change the rules.

## Money — never floating point
- Store the **smallest unit as an integer**: `$10.50` is `1050`. `0.1 + 0.2 = 0.30000000000000004`, and that error compounds through every calculation.
- Kotlin: `BigDecimal` or a `Money` value object. Never `Double` or `Float`.
- **Currency travels with the amount.** A bare number is not a price.
- Format at the edge with `Intl.NumberFormat`. Round once, at presentation, and define the rounding rule where money is split.

## Language
- Do not hard-code user-facing strings where multi-language support is required. Extract to `en.json` with `react-i18next`.
- Never build a sentence by concatenating fragments — word order differs between languages. Use interpolation with named placeholders.
- Leave room in layouts: German runs roughly 30% longer than English.

## Smells
A `TIMESTAMP` column with no zone, `Double` for a price, an amount with no currency, `"Hello " + name + ", you have " + n + " items"`, a date shifting by a day for one user, `toLocaleString()` called in a domain function.
