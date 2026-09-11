// Lucide icons at stroke-width 1.5, per the Industry design system.
import {
  Bookmark,
  ChevronRight,
  Circle,
  Download,
  Folder,
  FolderPlus,
  List,
  Pencil,
  Plus,
  Rss,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

export const ICON_STROKE = 1.5;

const defaults = { strokeWidth: ICON_STROKE, absoluteStrokeWidth: true } as const;

export const IconAll = (p: { size?: number }) => <List size={p.size ?? 14} {...defaults} />;
export const IconUnread = (p: { size?: number }) => <Circle size={p.size ?? 14} {...defaults} />;
export const IconBookmark = (p: { size?: number; fill?: boolean }) => (
  <Bookmark size={p.size ?? 14} fill={p.fill ? 'currentColor' : 'none'} {...defaults} />
);
export const IconFolder = (p: { size?: number }) => <Folder size={p.size ?? 14} {...defaults} />;
export const IconFeed = (p: { size?: number }) => <Rss size={p.size ?? 14} {...defaults} />;
export const IconChevron = (p: { size?: number }) => (
  <ChevronRight size={p.size ?? 12} {...defaults} />
);
export const IconRename = (p: { size?: number }) => <Pencil size={p.size ?? 13} {...defaults} />;
export const IconDelete = (p: { size?: number }) => <Trash2 size={p.size ?? 13} {...defaults} />;
export const IconNewFolder = (p: { size?: number }) => (
  <FolderPlus size={p.size ?? 14} {...defaults} />
);
export const IconPlus = (p: { size?: number }) => <Plus size={p.size ?? 14} {...defaults} />;
export const IconSearch = (p: { size?: number }) => <Search size={p.size ?? 14} {...defaults} />;
export const IconDownload = (p: { size?: number }) => (
  <Download size={p.size ?? 14} {...defaults} />
);
export const IconUpload = (p: { size?: number }) => <Upload size={p.size ?? 14} {...defaults} />;
