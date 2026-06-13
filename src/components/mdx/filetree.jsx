'use client';
import { File, Files, Folder } from './files';

/**
 * @param {FileTreeItem} item
 * @param {number} index
 */
const renderItem = (item, index) => {
  // Handle ellipsis items
  if (item === '...' || item === '…') {
    return <File key={index} name="…" />;
  }

  // Handle file items (both string and file objects)
  if (typeof item === 'string' || item.kind === 'file') {
    const fileName = typeof item === 'string' ? item : item.name;
    const note = typeof item === 'string' ? null : item.note;
    const displayName = note ? `${fileName} — ${note}` : fileName;

    return <File key={index} name={displayName} />;
  }

  // Handle folder objects
  if (item.kind === 'folder') {
    const isOpen = item.open ?? defaultOpen;
    const displayName = item.note ? `${item.name} — ${item.note}` : item.name;

    return (
      <Folder key={index} name={displayName} defaultOpen={isOpen}>
        {item?.items?.map((nestedItem, nestedIndex) => renderItem(nestedItem, nestedIndex))}
      </Folder>
    );
  }

  throw new Error(
    [
      `In the FileTree component, found: ${item}.`,
      `Expected either of: ..., …, string, { kind: "file", ... }, or { kind: "folder", ... }`,
    ].join(' '),
  );
};

/**
 * A thin wrapper over Fumadocs' Files, File, and Folder components.
 *
 * @typedef {(
 *   {name: string, note?: string}
 * )} FileTreeItemCommon
 *
 * @typedef {(
 *   | '...'
 *   | '…'
 *   | string
 *   | FileTreeItemCommon & {kind: 'file'}
 *   | FileTreeItemCommon & {kind: 'folder', open?: boolean, items?: FileTreeItem[] }
 * )} FileTreeItem
 *
 * @param {{ items: FileTreeItem[], defaultOpen?: boolean }} props
 */
export function FileTree({ items = [], defaultOpen = true, ...props }) {
  return <Files {...props}>{items.map((item, index) => renderItem(item, index))}</Files>;
}
