# Measure First

No performance work without a measurement. Intuition about bottlenecks is usually wrong.

## Rules for agents
- Write the clear version first. Optimise only when a number says it is too slow.
- Before optimising: state the metric, the current value, and the target.
- Profile to find the hot path; do not guess. Optimise the top cost, then re-measure.
- Re-measure after the change; if there is no meaningful gain, revert it.
- Report the numbers in your response — before and after.
- Do not trade readability for speed without evidence the trade is needed.

## Cheap wins that do not need a profiler
Algorithmic complexity (O(n²) in a loop over user data), N+1 queries, missing indexes, work repeated inside a loop, unbounded data pulled into memory. Fix these on sight.

## Applies beyond performance
Same rule for reliability and cost: instrument, measure, then act.

## Smells
"This should be faster", micro-optimisations in cold code, caching added without a hit-rate number, benchmarks that were never run.
