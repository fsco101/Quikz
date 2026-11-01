import { useLocalDraft } from "../../hooks/useLocalDraft.js";

export function DraftStatus({ draft, busy, attachmentName, onForgetAttachment }: {
  draft: ReturnType<typeof useLocalDraft>;
  busy?: boolean;
  attachmentName?: string;
  onForgetAttachment?: () => void;
}) {
  const disabled = busy || draft.working || draft.loading;
  return <aside aria-label="Draft autosave" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 space-y-2">
    {draft.conflict ? <>
      <p role="status">The server version has changed or another saved copy exists. Autosave is paused. Choose which copy to keep before publishing.</p>
      {draft.hasSavedCopy && <button type="button" disabled={disabled} className="mr-4 font-bold underline" onClick={draft.restoreConflict}>Restore saved draft</button>}
      <button type="button" disabled={disabled} className="mr-4 font-bold underline" onClick={draft.keepCurrent}>Keep editor copy</button>
      <button type="button" disabled={disabled} className="font-bold underline" onClick={draft.discard}>Discard saved draft</button>
    </> : <>
      <p role="status">{draft.message}</p>
      {draft.hasDraft && <button type="button" disabled={disabled} className="mr-4 font-bold underline" onClick={draft.discard}>Discard draft</button>}
      {draft.hasDraft && <button type="button" disabled={disabled} className="font-bold underline" onClick={() => void draft.retry()}>Retry sync</button>}
    </>}
    {attachmentName && <div className="space-y-2"><p className="break-all">Reselect “{attachmentName}” before uploading or generating another preview. File attachments are not stored in drafts.</p>
      {onForgetAttachment && <button type="button" disabled={disabled || draft.conflict} className="font-bold underline" onClick={onForgetAttachment}>Forget unuploaded file</button>}
    </div>}
  </aside>;
}
