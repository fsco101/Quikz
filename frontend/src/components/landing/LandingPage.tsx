import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, Compass, GraduationCap, Layers, LockKeyhole, Play, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Brand } from '../layout/Brand.js';
import './landing.css';

type Props = { onLogin: () => void; onSignup: () => void; onBrowse: () => void; onBrowseLessons: () => void };
const stages = ['Learn', 'Practice', 'Progress'] as const;
const faqs = [
  ['Can I explore before creating an account?', 'Absolutely. Browse the public subject catalog and lesson directory to see what interests you. Create an account when you’re ready to read lessons, take quizzes, and save your progress.'],
  ['How does the learning path work?', 'Work through a subject one module at a time. Complete its lessons and required assessments to unlock the next step, with a clear view of what’s finished and what’s still ahead.'],
  ['Is Quikz for students or teachers?', 'Both. Students follow guided learning paths and track their progress. Faculty create lessons and quizzes, connect with students, and review results in the gradebook.'],
];

export function LandingPage({ onLogin, onSignup, onBrowse, onBrowseLessons }: Props) {
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [audience, setAudience] = useState<'student' | 'faculty'>('student');
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });

  return <div className="landing-page">
    <a className="skip-link" href="#landing-main" onClick={(event) => { event.preventDefault(); document.getElementById('landing-main')?.focus(); }}>Skip to content</a>
    <header className="landing-header">
      <Brand />
      <nav aria-label="Main navigation"><button onClick={() => scrollTo('how-it-works')}>How it works</button><button onClick={() => scrollTo('made-for-you')}>Made for you</button><button onClick={onBrowse}>Explore subjects <ArrowUpRight size={13} /></button></nav>
      <div className="landing-account"><button className="landing-login" onClick={onLogin}>Log in</button><button className="ui-button ui-button-primary" onClick={onSignup}>Get started <ArrowRight size={15} /></button></div>
    </header>

    <main id="landing-main" tabIndex={-1}>
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="landing-pill"><span /> A LITTLE CURIOSITY GOES A LONG WAY</span>
          <h1 id="hero-title">Small steps.<br />Big <span>discoveries.</span></h1>
          <p>A clearer path from “I’m curious” to “I’ve got this.” Explore lessons, challenge yourself, and watch your understanding grow.</p>
          <div className="hero-actions"><button className="ui-button ui-button-primary" onClick={onSignup}>Start your learning journey <ArrowRight size={18} /></button><button className="ui-button ui-button-secondary" onClick={onBrowse}><Compass size={18} /> Explore subjects</button></div>
          <div className="hero-note"><span><BookOpen size={15} /> Learn at your pace</span><span><CheckCircle2 size={15} /> See every step forward</span></div>
        </div>

        <div className="hero-preview">
          <div className="preview-orbit" aria-hidden="true" />
          <div className="preview-floating"><span><Sparkles size={18} /></span><div>A little more confident.<strong>One lesson at a time.</strong></div></div>
          <section className="learning-preview" aria-label="Interactive learning preview">
            <div className="preview-top"><span className="preview-logo"><Layers size={16} /> Your learning space</span><span className="preview-badge">LIVE PREVIEW</span></div>
            <div className="preview-switch" aria-label="Preview steps">{stages.map((label, index) => <button key={label} aria-pressed={stage === index} onClick={() => setStage(index)}><span>0{index + 1}</span>{label}</button>)}</div>
            <div className="preview-body" key={stage}>
              {stage === 0 ? <>
                <div className="preview-course-art" aria-hidden="true"><div className="art-grid" /><span className="art-book"><BookOpen size={60} strokeWidth={1.3} /></span><span className="art-spark"><Sparkles size={25} /></span><span className="art-tag">IDEAS START HERE</span></div>
                <p className="eyebrow">A sample learning path</p><h2>The art of learning</h2><p className="preview-description">Turn a new idea into something that stays with you.</p>
                <div className="preview-lesson"><span><BookOpen size={17} /></span><div><strong>01 · Start with curiosity</strong><small>Read. Reflect. Make a connection.</small></div><ChevronRight size={17} /></div>
                <button className="preview-primary" onClick={() => setStage(1)}>Try a quick question <ArrowRight size={16} /></button>
              </> : stage === 1 ? <>
                <div className="preview-section-icon"><Target size={28} /></div><p className="eyebrow">A little practice</p><h2>Make it stick.</h2><p className="preview-question">Which approach helps you understand a new idea?</p>
                <div className="preview-answers">{['Connect it to something you know', 'Skip straight to the next topic', 'Memorize without reflecting'].map((label, index) => <button key={label} aria-pressed={answer === index} className={answer === index ? (index === 0 ? 'answer-correct' : 'answer-retry') : ''} onClick={() => setAnswer(index)}><span>{answer === index && index === 0 ? <Check size={14} /> : String.fromCharCode(65 + index)}</span>{label}</button>)}</div>
                <p className="preview-feedback" role="status">{answer === null ? 'Give it a go. This is just a preview.' : answer === 0 ? 'Exactly! Connections give new ideas a place to stay.' : 'Try again. Think about building on what you already know.'}</p>
                <button className="preview-primary" onClick={() => setStage(2)}>See the bigger picture <ArrowRight size={16} /></button>
              </> : <>
                <div className="preview-section-icon mint"><TrendingUp size={28} /></div><p className="eyebrow">Every step counts</p><h2>Look how far you’ve come.</h2><p className="preview-description">A sample of how your learning path comes together.</p>
                <div className="preview-progress"><div><span>Module progress</span><strong>2 of 3 steps</strong></div><div className="preview-progress-track"><span /></div></div>
                <ul className="preview-checklist"><li><CheckCircle2 size={20} /><span>Explore the lesson<small>A new idea, understood</small></span></li><li><CheckCircle2 size={20} /><span>Put it into practice<small>Knowledge, put to work</small></span></li><li><LockKeyhole size={20} /><span>Your next discovery<small>Complete this module to unlock</small></span></li></ul>
                <button className="preview-primary" onClick={onSignup}>Make your own progress <ArrowRight size={16} /></button>
              </>}
            </div>
            <div className="preview-caption"><span /> Illustrative preview · Your journey will be your own</div>
          </section>
          <button className="preview-hint" onClick={() => setStage((stage + 1) % stages.length)}><Play size={13} fill="currentColor" /> Go ahead, explore the preview <ArrowRight size={14} /></button>
        </div>
        <button className="hero-scroll" onClick={() => scrollTo('how-it-works')}>A better way to move forward <ArrowDown size={15} /></button>
      </section>

      <section className="landing-principles" aria-label="The Quikz approach"><span>LESS NOISE. MORE <strong>“NOW I GET IT.”</strong></span><div><BookOpen size={20} /> Thoughtful lessons</div><div><Target size={20} /> Purposeful practice</div><div><TrendingUp size={20} /> Meaningful progress</div></section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section-heading"><div><p className="eyebrow">FROM CURIOUS TO CONFIDENT</p><h2>A rhythm that works for you.</h2></div><p>No scattered tabs. No guessing what’s next.<br />Just a little more understanding, every day.</p></div>
        <div className="landing-steps">
          {[{ icon: BookOpen, title: 'Find your next “aha.”', text: 'Follow focused lessons in an organized learning path. Take the time you need to make each idea your own.', action: 'Explore lessons', click: onBrowseLessons }, { icon: Target, title: 'Give your knowledge a go.', text: 'Put what you’ve learned to the test with quizzes that help you see where you stand.', action: 'Try the preview', click: () => { setStage(1); scrollTo('hero-title'); } }, { icon: TrendingUp, title: 'See the steps add up.', text: 'Keep your progress in view, complete your modules, and move toward your next milestone.', action: 'Start making progress', click: onSignup }].map(({ icon: Icon, title, text, action, click }, i) => <article key={title} className={`landing-step step-${i}`}><div className="step-top"><span><Icon size={25} /></span><small>0{i + 1}</small></div><h3>{title}</h3><p>{text}</p><button onClick={click}>{action}<ArrowUpRight size={17} /></button></article>)}
        </div>
      </section>

      <section className="landing-audience" id="made-for-you">
        <div className="audience-copy"><p className="eyebrow">DIFFERENT ROLES. SHARED DISCOVERIES.</p><h2>A space to grow.<br />And help others grow.</h2><div className="audience-switch" aria-label="Choose your perspective"><button aria-pressed={audience === 'student'} onClick={() => setAudience('student')}><BookOpen size={16} /> For students</button><button aria-pressed={audience === 'faculty'} onClick={() => setAudience('faculty')}><GraduationCap size={18} /> For faculty</button></div><p>{audience === 'student' ? 'Your next step should feel clear. Find your subjects, work through lessons, and build confidence with every module you complete.' : 'Bring your expertise to life. Organize your lessons, create meaningful assessments, and give your students a clear way forward.'}</p><button onClick={onSignup}>Find your place in Quikz <ArrowRight size={17} /></button></div>
        <div className="audience-features" aria-live="polite">{(audience === 'student' ? [ ['A path with purpose', 'Follow lessons in an order that builds your understanding.', Compass], ['Your effort, made visible', 'See completed modules and what’s ready to unlock next.', TrendingUp], ['Connected to your faculty', 'Accept faculty invitations to share your learning progress.', GraduationCap] ] : [ ['Your lessons, thoughtfully organized', 'Create subjects and modules with text, documents, and video.', Layers], ['Assessments that fit your teaching', 'Build quizzes and manage questions in one place.', Target], ['A clearer picture of your class', 'Invite students and review their results in your gradebook.', GraduationCap] ]).map(([title, description, Icon]) => { const FeatureIcon = Icon as typeof Compass; return <div key={String(title)}><span><FeatureIcon size={22} /></span><section><h3>{String(title)}</h3><p>{String(description)}</p></section><Check size={18} /></div>; })}</div>
      </section>

      <section className="landing-faq landing-section"><div><p className="eyebrow">A FEW THINGS YOU MIGHT WONDER</p><h2>Curiosity starts<br />with a question.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="landing-cta"><span className="cta-spark" aria-hidden="true"><Sparkles size={32} /></span><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>There’s more in you<br />waiting to be discovered.</h2><button className="ui-button" onClick={onSignup}>Let’s get started <ArrowRight size={18} /></button><p>Bring your curiosity. We’ll help with the next step.</p></section>
    </main>
    <footer className="landing-footer"><Brand /><p>A little progress, every day.</p><div><button onClick={onBrowse}>Subject catalog</button><button onClick={onBrowseLessons}>Lesson directory</button><button onClick={onLogin}>Log in <ArrowUpRight size={14} /></button></div><span>© {new Date().getFullYear()} Quikz</span></footer>
  </div>;
}
