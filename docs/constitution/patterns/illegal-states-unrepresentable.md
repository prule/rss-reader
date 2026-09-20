# Make Illegal States Unrepresentable

Use types and constructors so invalid data cannot be built. The compiler and the constructor enforce rules that would otherwise need discipline and tests.

## Rules for agents
- **Parse, don't validate.** Validate once at the boundary and return a *type* that proves it: `ValidatedEmail`, not a `string` plus a checked-it-earlier convention.
- Wrap meaningful primitives. `UserId`, `Money`, `Percentage` — not `string`, `float`, `float`.
- Replace flag combinations with a union of the states that are actually possible. Three booleans allow eight states; if only three are legal, model three cases.
- Use non-nullable fields and required constructor arguments. No half-built objects mutated into validity.
- Make objects immutable by default; return a new instance instead of mutating.
- Use enums or unions instead of magic strings and ints.

## Example
`{ status: string, cancelledAt?: Date, shippedAt?: Date }` allows a cancelled-and-shipped order.
`Pending | Shipped(at) | Cancelled(at, reason)` does not.

## Payoff
Whole classes of test and defensive check disappear because the state cannot occur. This is `../principles/fail-fast.md` moved from runtime to compile time.

## When not to use this
Do not fight a weakly-typed language into knots. Where the type system will not carry it, enforce in the constructor and document the invariant.

## Smells
`if (user.email == null) throw` repeated in ten places, boolean pairs like `isActive`/`isDeleted`, optional fields that are mandatory in certain states, re-validating the same value at every layer.
