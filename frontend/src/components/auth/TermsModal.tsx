import React, { useState, useRef } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setAgreed(false);
      setHasScrolledToBottom(false);
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          const { scrollHeight, clientHeight } = scrollRef.current;
          if (scrollHeight - clientHeight <= 25) {
            setHasScrolledToBottom(true);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 25) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070235]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#c8c5d0] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#c8c5d0]/50 bg-[#f8f9ff] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6063ee]/10 text-[#4648d4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#070235]">Academic Integrity & Legal Policy Gate</h3>
              <p className="text-xs text-[#47464f]">Mandatory institutional compliance protocol before account initialization</p>
            </div>
          </div>
          {hasScrolledToBottom ? (
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-emerald-200">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Policy Read
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-amber-200">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              Scroll to Bottom Required
            </span>
          )}
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-4 max-h-[440px] bg-white text-[#0b1c30] text-sm leading-relaxed border-b border-[#c8c5d0]/40 select-text"
        >
          <div className="p-3.5 bg-[#eff4ff] rounded-xl border border-[#d3e4fe] text-xs text-[#47464f]">
            <strong className="text-[#070235] font-bold">ATTENTION REGISTRANT:</strong> This is a legally and academically binding declaration for the Quikz platform. Every assessment and evaluation is recorded with institutional academic integrity tracking.
          </div>

          <section className="space-y-1">
            <h4 className="font-bold text-[#070235] text-sm flex items-center gap-1.5">
              <span className="text-[#6063ee]">1.</span> Assessment Settings & Evaluation Rigor
            </h4>
            <p className="text-xs text-[#47464f] leading-relaxed">
              Faculty set the passing percentage, questions per attempt, and time per question in seconds or minutes. Candidates must meet the published passing mark before progressing to the next module. Module quizzes may be retaken immediately to practice and improve. Gated course modules require full verification and completion of previous chapter milestones.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-bold text-[#070235] text-sm flex items-center gap-1.5">
              <span className="text-[#6063ee]">2.</span> Curriculum Library & Intellectual Property
            </h4>
            <p className="text-xs text-[#47464f] leading-relaxed">
              All document reader assets, including lecture notes, faculty-annotated lecture slides, and quizzes, are protected under institutional copyright. Users are strictly prohibited from exporting raw text corpuses into unauthorized third-party platforms without faculty authorization.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-bold text-[#070235] text-sm flex items-center gap-1.5">
              <span className="text-[#6063ee]">3.</span> Academic Honor Code & Zero-Cheating Directive
            </h4>
            <p className="text-xs text-[#47464f] leading-relaxed">
              Participants certify that all responses submitted during quizzes represent their sole original intellectual output. The platform implements response validation, time-tracking deviation analytics, and single-attempt integrity rules during assessment windows.
            </p>
            <p className="text-xs text-[#47464f] leading-relaxed">
              Violations result in immediate revocation of faculty or student credentials and administrative escalation to academic management.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-bold text-[#070235] text-sm flex items-center gap-1.5">
              <span className="text-[#6063ee]">4.</span> Student Privacy & Record Retention
            </h4>
            <p className="text-xs text-[#47464f] leading-relaxed">
              Student performance metrics, including quiz attempts and scores, are disclosed solely to verified faculty chairs and course instructors of record. Records are maintained by Year Level and Section.
            </p>
          </section>

          <section className="space-y-1 pt-2">
            <h4 className="font-bold text-[#070235] text-sm flex items-center gap-1.5">
              <span className="text-[#6063ee]">5.</span> Signature & Digital Execution
            </h4>
            <p className="text-xs text-[#47464f] leading-relaxed">
              By scrolling through this policy in its entirety and ticking the execution checkmark below, you attest under penalty of academic suspension that all personal identity markers provided are authentic and accurate.
            </p>
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold">
              ✓ END OF DOCUMENT REACHED — TERMS READY FOR CONFIRMATION
            </div>
          </section>
        </div>

        {/* Action Panel */}
        <div className="p-6 bg-white flex flex-col gap-4">
          <label
            className={`flex items-start gap-3 select-none transition-opacity duration-150 ${
              hasScrolledToBottom ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40'
            }`}
          >
            <input
              type="checkbox"
              disabled={!hasScrolledToBottom}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[#c8c5d0] text-[#6063ee] focus:ring-[#6063ee] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-[#0b1c30]">
              I agree to the <strong className="text-[#070235]">Terms of Service</strong>, <strong className="text-[#070235]">Privacy Policy</strong>, and pledge strict adherence to the <strong className="text-[#4648d4]">Academic Honor Code</strong>.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#c8c5d0] text-[#47464f] text-xs font-semibold hover:bg-[#eff4ff] transition-colors"
            >
              Cancel & Return
            </button>
            <button
              type="button"
              disabled={!hasScrolledToBottom || !agreed}
              onClick={() => {
                onAccept();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
                hasScrolledToBottom && agreed
                  ? 'bg-[#4648d4] text-white hover:bg-[#3436b8] shadow-md hover:shadow-lg cursor-pointer'
                  : 'bg-[#eff4ff] text-[#47464f]/50 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Accept & Enable Account Creation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
