import React, { useState } from 'react';
import { api } from '../../services/api.js';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [term, setTerm] = useState('1st Semester');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await api.createSubject({
        name,
        code,
        term,
        yearLevel,
        description
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070235]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#c8c5d0] rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#c8c5d0]/50 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6063ee]/10 text-[#4648d4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">library_add</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#070235]">Create Academic Subject</h3>
              <p className="text-xs text-[#47464f]">Author new curriculum catalog entry</p>
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
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#070235] mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
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
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c8c5d0] bg-white focus:outline-none focus:border-[#4648d4]"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer Term">Summer Term</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#070235] mb-1">
                Year Level <span className="text-red-500">*</span>
              </label>
              <select
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
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>{loading ? 'Creating...' : 'Create Subject'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
