## Purpose

Provides the folder-and-feed hierarchy in the sidebar that users organize by drag and drop, giving every feed a position in an arbitrary tree that other capabilities read for aggregation and tagging.

## ADDED Requirements

### Requirement: Arbitrary folder/feed hierarchy

The system SHALL represent the library as a tree of folder and feed nodes where folders may contain feeds and other folders to any depth, and any node may live at the top level.

#### Scenario: Nested folders

- **WHEN** a folder is placed inside another folder
- **THEN** the tree displays it indented under its parent and both remain navigable

### Requirement: Create and rename folders

The system SHALL allow the user to create a new folder and to rename any folder or feed inline. A rename that resolves to empty text SHALL leave the existing name unchanged.

#### Scenario: New folder

- **WHEN** the user creates a new folder
- **THEN** an empty folder appears at the top level, ready to be renamed

#### Scenario: Rename to empty keeps old name

- **WHEN** the user commits a rename with only whitespace
- **THEN** the node keeps its previous name

### Requirement: Drag and drop to reorganize

The system SHALL allow the user to move a node by dragging it onto a folder (making it a child), onto a feed (making it a sibling under that feed's parent), or onto the top-level drop area (making it a root node). The system MUST prevent a folder from being dropped into itself or into any of its own descendants.

#### Scenario: Drop into a folder

- **WHEN** a node is dropped onto a folder
- **THEN** it becomes a child of that folder

#### Scenario: Drop to top level

- **WHEN** a node is dropped onto the top-level drop area
- **THEN** it becomes a root node with no parent

#### Scenario: Cycle prevented

- **WHEN** the user attempts to drop a folder onto itself or one of its descendants
- **THEN** the move is rejected and the tree is unchanged

### Requirement: Collapse and expand folders

The system SHALL allow folders to be collapsed and expanded, and SHALL persist each folder's collapsed state.

#### Scenario: Collapsed folder hides children

- **WHEN** a folder is collapsed
- **THEN** its descendants are hidden from the tree until it is expanded again

### Requirement: Delete nodes with defined cascade

The system SHALL allow deleting any node. Deleting a folder SHALL reparent its direct children to the deleted folder's parent (children are not destroyed). Deleting a feed SHALL remove that feed's entries. If the deleted node is the current selection, the selection SHALL fall back to All Entries.

#### Scenario: Delete folder reparents children

- **WHEN** a folder containing feeds and subfolders is deleted
- **THEN** those children move up to the deleted folder's parent
- **AND** no entries are lost

#### Scenario: Delete feed removes its entries

- **WHEN** a feed is deleted
- **THEN** the feed and all of its entries are removed

#### Scenario: Deleting the selected node resets selection

- **WHEN** the currently selected node is deleted
- **THEN** the entry list falls back to showing All Entries
