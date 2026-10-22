import React, { useState } from 'react';
import { ModuleItem } from '../../types/curriculum.js';
import { api } from '../../services/api.js';

interface CreateModuleModalProps {
  isOpen: boolean;
  module?: ModuleItem;
  subjectId: string;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({
  isOpen,
  module,
  subjectId,
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState(module?.title || '');
  const [summary, setSummary] = useState(module?.summary || '');
  const [contentType, setContentType] = useState<'text' | 'file' | 'presentation'>(module?.contentType || 'text');
  const [textContent, setTextContent] = useState(module?.textContent || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [removeFile, setRemoveFile] = useState(false);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('summary', summary);
      formData.append('contentType', contentType);
      formData.append('textContent', textContent);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (module?.__v !== undefined) formData.append('version', String(module.__v));
      if (removeFile) formData.append('removeFile', 'true');
      if (module) await api.request(`/modules/${module._id}`, { method: 'PATCH', body: formData });
      else await api.createModule(subjectId, formData);
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create module');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070235]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#c8c5d0] rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#c8c5d0]/50 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6063ee]/10 text-[#4648d4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">post_add</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#070235]">{module ? 'Edit learning module' : 'Add Topic / Learning Module'}</h3>
              <p className="text-xs text-[#47464f]">Author new sequential material for this subject</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] text-[#47464f] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#070235] mb-1">
              Topic / Module Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              aria-label="Module title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Module 4: Tree Traversals & Binary Heaps"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-[#070235]">
                Executive Topic Summary (Requirement 5a) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#6063ee] font-semibold">Displayed in Reader Header</span>
            </div>
            <textarea
              rows={2}
              required
              aria-label="Module summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide a high-level concise summary of the core concepts covered in this module..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#070235] mb-1">Content Delivery Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setContentType('text')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  contentType === 'text'
                    ? 'border-[#4648d4] bg-[#eff4ff] text-[#4648d4]'
                    : 'border-[#c8c5d0] text-[#47464f]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">article</span>
                <span>Lecture Text</span>
              </button>

              <button
                type="button"
                onClick={() => setContentType('file')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  contentType === 'file'
                    ? 'border-[#4648d4] bg-[#eff4ff] text-[#4648d4]'
                    : 'border-[#c8c5d0] text-[#47464f]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>Document / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setContentType('presentation')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  contentType === 'presentation'
                    ? 'border-[#4648d4] bg-[#eff4ff] text-[#4648d4]'
                    : 'border-[#c8c5d0] text-[#47464f]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">slideshow</span>
                <span>Presentation</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#070235] mb-1">Lecture Text & Notes</label>
            <textarea
              rows={5}
              aria-label="Lecture text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste or write formatted lecture notes, learning objectives, and detailed text content..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#070235] mb-1">
              Upload Slide Presentation / Document Attachment
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-[#47464f] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#4648d4] hover:file:bg-[#d3e4fe] cursor-pointer"
            />
          </div>

          {module?.fileName && <label className="flex items-center gap-2"><input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />Remove current attachment: {module.fileName}</label>}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#c8c5d0]/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#c8c5d0] text-[#47464f] font-semibold hover:bg-[#eff4ff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#070235] hover:bg-[#1e1b4b] text-white font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{loading ? 'Saving Module...' : module ? 'Save module changes' : 'Publish Module to Course'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
