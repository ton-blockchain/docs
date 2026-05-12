"use client"
import {ArrowRight, Loader2, Redo2, Save, Undo2} from "lucide-react"

export interface SaveBarProps {
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPreviewSave: () => void
  saveStatus: "idle" | "saving" | "error"
  changeCount: number
  moveCount: number
  warnings: string[]
  blocked: boolean
  blockedReason?: string
}

export function SaveBar({
  dirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreviewSave,
  saveStatus,
  changeCount,
  moveCount,
  warnings,
  blocked,
  blockedReason,
}: SaveBarProps) {
  return (
    <div className="flex h-12 items-center gap-3 border-t border-fd-border bg-fd-card/30 px-4 text-sm">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        className="rounded p-1 hover:bg-fd-accent disabled:opacity-40"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
        className="rounded p-1 hover:bg-fd-accent disabled:opacity-40"
      >
        <Redo2 size={16} />
      </button>
      <div className="text-fd-muted-foreground">
        {dirty ? `${changeCount} unsaved change${changeCount === 1 ? "" : "s"}` : "No changes"}
        {moveCount > 0 && (
          <span className="ml-2">
            <ArrowRight size={12} className="inline" /> {moveCount} file move{moveCount === 1 ? "" : "s"} planned
          </span>
        )}
      </div>
      {warnings.length > 0 && (
        <div className="text-xs text-fd-warning">
          {warnings[0]}
          {warnings.length > 1 && ` (+${warnings.length - 1} more)`}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {blocked && blockedReason && (
          <span className="text-xs text-fd-muted-foreground">{blockedReason}</span>
        )}
        <button
          type="button"
          onClick={onPreviewSave}
          disabled={!dirty || saveStatus === "saving" || blocked}
          title={blocked ? blockedReason : undefined}
          className="flex items-center gap-2 rounded bg-fd-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-fd-primary/90 disabled:opacity-40"
        >
          {saveStatus === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saveStatus === "saving" ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}
