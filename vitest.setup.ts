import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// findBy*/waitFor give up after 1s by default. Live queries over a few hundred
// rows can take longer than that when the suite runs in parallel on a busy
// machine, so allow more — a passing assertion still returns the moment it holds.
configure({ asyncUtilTimeout: 10_000 });
