import { ValidatedForm } from "../ui/ValidatedForm.js";
import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { Subject } from '../../types/curriculum.js';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  subject?: Subject;
}

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  subject,
}) => {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [term, setTerm] = useState(subject?.term || '1st Semester');
  const [yearLevel, setYearLevel] = useState(subject?.yearLevel || '3rd Year');
  const [description, setDescription] = useState(subject?.description || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const details = { name, code, term, yearLevel, description };
      if (subject) await api.request(`/subjects/${subject._id}`, { method: 'PATCH', body: JSON.stringify(details) });
      else await api.createSubject(details);
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={subject ? 'Edit subject' : 'Create subject'} className="fixed inset-0 z-50 bg-[#070235]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#c8c5d0] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#c8c5d0]/50 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6063ee]/10 text-[#4648d4] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">library_add</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#070235]">{subject ? 'Edit Academic Subject' : 'Create Academic Subject'}</h3>
              <p className="text-xs text-[#47464f]">{subject ? 'Update your subject details and syllabus overview' : 'Author new curriculum catalog entry'}</p>
            </div>
          </div>
          <button
            aria-label="Close form"
            disabled={loading}
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] text-[#47464f] flex items-center justify-center transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <ValidatedForm onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#070235] mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              aria-label="Subject name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4]"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#070235] mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                aria-label="Subject code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CS102"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-[#070235] mb-1">
                Term / Semester <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Subject term"
                required
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c8c5d0] bg-white focus:outline-none focus:border-[#4648d4]"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                {subject && !['1st Semester', '2nd Semester', '3rd Semester'].includes(subject.term) && <option value={subject.term}>{subject.term}</option>}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#070235] mb-1">
                Year Level <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Subject year level"
                required
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c8c5d0] bg-white focus:outline-none focus:border-[#4648d4]"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#070235] mb-1">Description / Syllabus Overview</label>
            <textarea
              aria-label="Subject description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a high-level course overview and objectives..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#c8c5d0]/40">
            <button
              type="button"
              disabled={loading}
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
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>{loading ? 'Saving...' : subject ? 'Save subject changes' : 'Create Subject'}</span>
            </button>
          </div>
        </ValidatedForm>
      </div>
    </div>
  );
};
