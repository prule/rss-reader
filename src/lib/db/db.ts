// The Dexie database: schema and nothing else. Every read and write goes
// through repository.ts, which is the only module that should import this.
//
// Each index here exists for a query the UI actually issues — see
// openspec/changes/replace-localstorage-with-dexie/design.md for the mapping.
// `read` and `marked` are stored as 0/1 because IndexedDB cannot index a
// boolean; rows.ts owns that translation.
import Dexie, { type EntityTable } from 'dexie';
import type { EntryRow, NodeRow } from './rows';

export const DB_NAME = 'rss-reader-pwa';

/** Bumped only by a forward-only `version(n).upgrade()` block below. */
export const SCHEMA_VERSION = 1;

export class LibraryDb extends Dexie {
  nodes!: EntityTable<NodeRow, 'id'>;
  entries!: EntityTable<EntryRow, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      nodes: 'id, parentId',
      // The compound indexes are what make an ordered page walkable with
      // `.limit()`: a Dexie collection from `anyOf` or a bare `read` equality
      // has no `orderBy`, so without them an ordered page could only be built
      // by loading the whole selection. The single-field `read`/`marked`
      // indexes stay for `count()`, which does not want the compound.
      entries: [
        'id',
        'feedId',
        'publishedAt',
        '[feedId+publishedAt]',
        '[read+publishedAt]',
        '[marked+publishedAt]',
        'read',
        'marked',
        'guid',
      ].join(', '),
    });
  }
}

export const db = new LibraryDb();
