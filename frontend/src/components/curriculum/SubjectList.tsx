import React, { useState, useEffect } from 'react';
import { Subject } from '../../types/curriculum.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { CreateSubjectModal } from './CreateSubjectModal.js';

interface SubjectListProps {
  onSelectSubject: (subject: Subject) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({ onSelectSubject }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('All');

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.getSubjects();
      setSubjects(res.subjects);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.facultyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = filterYear === 'All' || s.yearLevel === filterYear;
    return matchesQuery && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-2xl border border-[#c8c5d0]/50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#070235]">Academic Subject Catalog</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#4648d4] text-[11px] font-bold border border-[#d3e4fe]">
              {subjects.length} Active Courses
            </span>
          </div>
          <p className="text-xs text-[#47464f] mt-1">
            Browse modular learning curricula and track course prerequisite milestones.
          </p>
        </div>

        {user?.role === 'faculty' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#070235] hover:bg-[#1e1b4b] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Create New Subject</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#47464f] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, title, or instructor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#c8c5d0] bg-white text-xs focus:outline-none focus:border-[#4648d4]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['All', '1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
            <button
              key={yr}
              onClick={() => setFilterYear(yr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterYear === yr
                  ? 'bg-[#4648d4] text-white shadow-sm'
                  : 'bg-white border border-[#c8c5d0] text-[#47464f] hover:bg-[#eff4ff]'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[#4648d4] text-[36px] animate-spin">
            progress_activity
          </span>
          <p className="text-xs font-bold text-[#070235]">Loading Academic Catalog...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#c8c5d0] p-12 text-center">
          <span className="material-symbols-outlined text-[#c8c5d0] text-[48px] mb-2">menu_book</span>
          <h3 className="text-sm font-bold text-[#070235]">No Subjects Found</h3>
          <p className="text-xs text-[#47464f] mt-1">Try adjusting your search criteria or create a new subject.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <div
              key={subject._id}
              onClick={() => onSelectSubject(subject)}
              className="bg-white rounded-2xl border border-[#c8c5d0]/60 hover:border-[#4648d4] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#4648d4] text-xs font-black tracking-wide border border-[#d3e4fe]">
                    {subject.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#47464f]">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span>{subject.term}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#070235] group-hover:text-[#4648d4] transition-colors leading-snug mb-2">
                  {subject.name}
                </h3>

                <p className="text-xs text-[#47464f] line-clamp-2 leading-relaxed mb-4">
                  {subject.description || 'Structured academic modules with sequential progression gating and mastery verification.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[#c8c5d0]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#eff4ff] text-[#4648d4] flex items-center justify-center text-xs font-bold">
                    {subject.facultyName.charAt(0)}
                  </div>
                  <div className="text-[11px]">
                    <div className="font-bold text-[#070235]">{subject.facultyName}</div>
                    <div className="text-[#47464f]">{subject.yearLevel}</div>
                  </div>
                </div>

                <span className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#4648d4] group-hover:bg-[#4648d4] group-hover:text-white flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      <CreateSubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchSubjects}
      />
    </div>
  );
};
