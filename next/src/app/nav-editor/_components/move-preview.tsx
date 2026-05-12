"use client"
import {ArrowRight, AlertTriangle, Loader2, X} from "lucide-react"
import {useState} from "react"

interface MovePreviewProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  moves: Array<{from: string; to: string}>
  saveLog: string
  saving: boolean
  warnings: string[]
}

export function MovePreviewDrawer(props: MovePreviewProps) {
  if (!props.open) return null
  return <MovePreviewDrawerInner {...props} />
}

function MovePreviewDrawerInner({
  onClose,
  onConfirm,
  moves,
  saveLog,
  saving,
  warnings,
}: MovePreviewProps) {
  const [confirmedBulk, setConfirmedBulk] = useState(false)
  const requiresConfirmation = moves.length > 10
  const canConfirm = !saving && (!requiresConfirmation || confirmedBulk)
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[640px] flex-col rounded-lg border border-fd-border bg-fd-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Save changes</h2>
            <p className="text-xs text-fd-muted-foreground">
              {moves.length === 0
                ? "No file moves planned."
                : `${moves.length} file move${moves.length === 1 ? "" : "s"} and ${moves.length} redirect${moves.length === 1 ? "" : "s"} will be created.`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-fd-accent">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {warnings.length > 0 && (
            <div className="m-3 flex items-start gap-2 rounded border border-fd-warning/40 bg-fd-warning/10 p-3 text-sm text-fd-warning">
              <AlertTriangle size={14} className="mt-0.5" />
              <ul className="list-disc pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {moves.length > 0 && (
            <div className="border-b border-fd-border p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">
                Planned moves
              </h3>
              <ul className="space-y-1 font-mono text-xs">
                {moves.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-fd-muted-foreground">/{m.from}</span>
                    <ArrowRight size={12} />
                    <span>/{m.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {saveLog && (
            <pre className="m-3 max-h-[200px] overflow-y-auto rounded bg-fd-muted/30 p-3 text-[11px] leading-snug">
              {saveLog}
            </pre>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-fd-border px-4 py-3">
          {requiresConfirmation && (
            <label className="mr-auto flex items-center gap-2 text-xs text-fd-warning">
              <input
                type="checkbox"
                checked={confirmedBulk}
                onChange={e => setConfirmedBulk(e.target.checked)}
              />
              <span>
                I&apos;ve reviewed the {moves.length} moves and redirects above.
              </span>
            </label>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 rounded bg-fd-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-fd-primary/90 disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Applying..." : "Confirm save"}
          </button>
        </div>
      </div>
    </div>
  )
}
