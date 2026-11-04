import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, Compass, GraduationCap, Layers, LockKeyhole, Play, RotateCcw, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import { Brand } from '../layout/Brand.js';
import { BookMascot, MascotMood } from '../mascot/BookMascot.js';
import { SplitHeadline } from './SplitHeadline.js';
import { Marquee } from './Marquee.js';
import { StickyStack } from './StickyStack.js';
import { SubjectCoverflow } from './SubjectCoverflow.js';
import './landing.css';

type Props = { onLogin: () => void; onSignup: () => void; onBrowse: () => void; onBrowseLessons: () => void };
const stages = ['Learn', 'Practice', 'Progress'] as const;
const faqs = [
  ['Can I explore before creating an account?', 'Absolutely. Browse the public subject catalog and lesson directory to see what interests you. Create an account when you’re ready to read lessons, take quizzes, and save your progress.'],
  ['How does the learning path work?', 'Work through a subject one module at a time. Complete its lessons and required assessments to unlock the next step, with a clear view of what’s finished and what’s still ahead.'],
  ['Is Quikz for students or teachers?', 'Both. Students follow guided learning paths and track their progress. Faculty create lessons and quizzes, connect with students, and review results in the gradebook.'],
  ['Who is Paige?', 'Paige is the Quikz book buddy. You’ll find Paige in the corner of every page with a study tip for that page or an “aha” moment about how learning works. Tap Paige anytime, or hide Paige if you’d rather study solo.'],
];
const dos = [
  { mood: 'read' as MascotMood, tip: 'Read first. Quiz second.', doTitle: 'Finish the whole lesson before the quiz.', doText: 'Give each idea a moment to land. The quiz is a check-in, not a race.', dontTitle: 'Jump straight to the questions.', dontText: 'Guessing first teaches you the answers, not the idea.' },
  { mood: 'think' as MascotMood, tip: 'Link it to something you know.', doTitle: 'Connect new ideas to what you already know.', doText: 'An example from your own life gives a new concept somewhere to stay.', dontTitle: 'Memorize without understanding.', dontText: 'Facts without meaning fade by next week.' },
  { mood: 'happy' as MascotMood, tip: 'A little, often. That’s the trick.', doTitle: 'Study in short, regular sessions.', doText: 'Twenty focused minutes a day beats a five-hour scramble.', dontTitle: 'Cram a whole module in one night.', dontText: 'Tired brains skim. Rested brains remember.' },
  { mood: 'wink' as MascotMood, tip: 'Your effort, your progress.', doTitle: 'Do your own work and ask for help.', doText: 'Stuck? Reach out to your faculty. That’s what they’re there for.', dontTitle: 'Share or copy quiz answers.', dontText: 'It breaks the honor code and skips the learning you came for.' },
];

export function LandingPage({ onLogin, onSignup, onBrowse, onBrowseLessons }: Props) {
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [audience, setAudience] = useState<'student' | 'faculty'>('student');
  const [tip, setTip] = useState(0);
  const [sopStep, setSopStep] = useState(0);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });

  const [heroMood, heroLine]: [MascotMood, string] = stage === 0 ? ['wave', 'Hi, I’m Paige! Tap through the preview with me.']
    : stage === 1 ? (answer === null ? ['think', 'Hmm… which one would you pick?'] : answer === 0 ? ['cheer', 'Yes! That’s exactly it.'] : ['oops', 'Oops, so close. Give it another go!'])
    : ['happy', 'Look at you go. Two of three done!'];

  const sop = [
    { icon: BookOpen, title: 'Find your next “aha.”', text: 'Open a subject and follow its lessons in order. Take the time you need to make each idea your own.', chips: ['Pick a subject', 'Read the module', 'Take notes'], action: 'Explore lessons', click: onBrowseLessons },
    { icon: Target, title: 'Give your knowledge a go.', text: 'Put what you’ve learned to the test with a quiz that shows you exactly where you stand.', chips: ['Timed or untimed', 'Instant results', 'No pressure'], action: 'Try the preview', click: () => { setStage(1); scrollTo('hero-title'); } },
    { icon: RotateCcw, title: 'Look back, then level up.', text: 'Check which questions tripped you up and revisit that part of the lesson before you move on.', chips: ['Review answers', 'Revisit lessons', 'Try again'], action: 'Browse the catalog', click: onBrowse },
    { icon: TrendingUp, title: 'See the steps add up.', text: 'Complete a module to unlock the next one, and watch your progress grow across every subject.', chips: ['Unlock modules', 'Track progress', 'Celebrate'], action: 'Start making progress', click: onSignup },
  ];

  return <div className="landing-page">
    <a className="skip-link" href="#landing-main" onClick={(event) => { event.preventDefault(); document.getElementById('landing-main')?.focus(); }}>Skip to content</a>
    <header className="landing-header">
      <Brand />
      <nav aria-label="Main navigation"><button onClick={() => scrollTo('how-it-works')}>How it works</button><button onClick={() => scrollTo('made-for-you')}>Made for you</button><button onClick={() => scrollTo('study-tips')}>Study tips</button><button onClick={onBrowse}>Explore subjects <ArrowUpRight size={13} /></button></nav>
      <div className="landing-account"><button className="landing-login" onClick={onLogin}>Log in</button><button className="ui-button ui-button-primary" onClick={onSignup}>Get started <ArrowRight size={15} /></button></div>
    </header>

    <main id="landing-main" tabIndex={-1}>
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-glow" aria-hidden="true"><i className="glow glow-outer" /><i className="glow glow-inner" /></div>
        <div className="hero-copy">
          <span className="landing-pill"><span /> A LITTLE CURIOSITY GOES A LONG WAY</span>
          <SplitHeadline id="hero-title" lines={[{ text: 'Small steps.' }, { text: 'Big ', accent: 'discoveries.' }]} />
          <p>A clearer path from “I’m curious” to “I’ve got this.” Explore lessons, challenge yourself, and watch your understanding grow.</p>
          <div className="hero-actions"><button className="ui-button ui-button-primary" onClick={onSignup}>Start your learning journey <ArrowRight size={18} /></button><button className="ui-button ui-button-secondary" onClick={onBrowse}><Compass size={18} /> Explore subjects</button></div>
          <div className="hero-note"><span><BookOpen size={15} /> Learn at your pace</span><span><CheckCircle2 size={15} /> See every step forward</span></div>
        </div>

        <div className="hero-preview">
          <div className="hero-mascot" aria-hidden="true">
            <BookMascot mood={heroMood} watchPointer />
            <p className="mascot-bubble" key={heroLine}>{heroLine}</p>
          </div>
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

      <Marquee label="What you can do on Quikz" rows={[
        ['Read with purpose', 'Practice with quizzes', 'Track every step', 'Unlock what’s next'],
        ['Students', 'Faculty', 'Subjects', 'Modules', 'Gradebook'],
      ]} />

      <section className="landing-section landing-sop" id="how-it-works">
        <div className="sop-intro">
          <p className="eyebrow">STANDARD OPERATING PROCEDURE</p>
          <h2>A rhythm that works for you.</h2>
          <p>No scattered tabs. No guessing what’s next. Every study session on Quikz follows the same four simple steps.</p>
          <ol className="sop-index">{sop.map((step, i) => <li key={step.title} className={i === sopStep ? 'is-active' : ''}><span>0{i + 1}</span>{step.title}</li>)}</ol>
        </div>
        <StickyStack className="sop-stack" label="Your study session, step by step" onActiveChange={setSopStep}>
          {sop.map(({ icon: Icon, title, text, chips, action, click }, i) => <article key={title} className={`sop-card sop-tone-${i}`}>
            <div className="sop-card-top"><span className="sop-icon"><Icon size={24} /></span><small>STEP 0{i + 1} <span>/ 0{sop.length}</span></small></div>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul className="sop-chips">{chips.map((chip) => <li key={chip}><Check size={13} aria-hidden="true" />{chip}</li>)}</ul>
            <button onClick={click}>{action}<ArrowUpRight size={17} /></button>
            <span className="sop-number" aria-hidden="true">0{i + 1}</span>
          </article>)}
        </StickyStack>
      </section>

      <section className="landing-audience" id="made-for-you">
        <div className="audience-copy"><p className="eyebrow">DIFFERENT ROLES. SHARED DISCOVERIES.</p><h2>A space to grow.<br />And help others grow.</h2><div className="audience-switch" aria-label="Choose your perspective"><button aria-pressed={audience === 'student'} onClick={() => setAudience('student')}><BookOpen size={16} /> For students</button><button aria-pressed={audience === 'faculty'} onClick={() => setAudience('faculty')}><GraduationCap size={18} /> For faculty</button></div><p>{audience === 'student' ? 'Your next step should feel clear. Find your subjects, work through lessons, and build confidence with every module you complete.' : 'Bring your expertise to life. Organize your lessons, create meaningful assessments, and give your students a clear way forward.'}</p><button onClick={onSignup}>Find your place in Quikz <ArrowRight size={17} /></button></div>
        <div className="audience-features" aria-live="polite">{(audience === 'student' ? [ ['A path with purpose', 'Follow lessons in an order that builds your understanding.', Compass], ['Your effort, made visible', 'See completed modules and what’s ready to unlock next.', TrendingUp], ['Connected to your faculty', 'Accept faculty invitations to share your learning progress.', GraduationCap] ] : [ ['Your lessons, thoughtfully organized', 'Create subjects and modules with text, documents, and video.', Layers], ['Assessments that fit your teaching', 'Build quizzes and manage questions in one place.', Target], ['A clearer picture of your class', 'Invite students and review their results in your gradebook.', GraduationCap] ]).map(([title, description, Icon]) => { const FeatureIcon = Icon as typeof Compass; return <div key={String(title)}><span><FeatureIcon size={22} /></span><section><h3>{String(title)}</h3><p>{String(description)}</p></section><Check size={18} /></div>; })}</div>
      </section>

      <section className="landing-section landing-subjects" id="subjects" aria-labelledby="subjects-title">
        <div className="landing-section-heading"><div><p className="eyebrow">FLIP THROUGH THE SHELF</p><h2 id="subjects-title">Find a subject that sparks something.</h2></div><p>Swipe, click, or use your arrow keys.<br />Pick the cover in front to open the catalog.</p></div>
        <SubjectCoverflow onOpen={onBrowse} />
      </section>

      <section className="landing-section landing-dos" id="study-tips">
        <div className="dos-intro">
          <p className="eyebrow">DO’S AND DON’TS</p>
          <h2>Study smarter,<br />not harder.</h2>
          <p>A few habits that make every lesson count. Paige has been practicing them for a while.</p>
          <div className="dos-mascot" aria-hidden="true">
            <BookMascot mood={dos[tip].mood} />
            <p className="mascot-bubble" key={tip}>{dos[tip].tip}</p>
          </div>
        </div>
        <StickyStack className="dos-stack" label="Study do’s and don’ts" onActiveChange={setTip}>
          {dos.map((item, i) => <article key={item.doTitle} className="dos-card">
            <small className="dos-count">HABIT 0{i + 1}</small>
            <div className="dos-half dos-do"><span className="dos-badge"><Check size={16} /> Do</span><h3>{item.doTitle}</h3><p>{item.doText}</p></div>
            <div className="dos-half dos-dont"><span className="dos-badge"><X size={16} /> Don’t</span><h3>{item.dontTitle}</h3><p>{item.dontText}</p></div>
          </article>)}
        </StickyStack>
      </section>

      <section className="landing-faq landing-section"><div><p className="eyebrow">A FEW THINGS YOU MIGHT WONDER</p><h2>Curiosity starts<br />with a question.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="landing-cta"><div className="cta-mascot" aria-hidden="true"><BookMascot mood="cheer" /></div><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>There’s more in you<br />waiting to be discovered.</h2><button className="ui-button" onClick={onSignup}>Let’s get started <ArrowRight size={18} /></button><p>Bring your curiosity. We’ll help with the next step.</p></section>
    </main>
    <footer className="landing-footer"><Brand /><p>A little progress, every day.</p><div><button onClick={onBrowse}>Subject catalog</button><button onClick={onBrowseLessons}>Lesson directory</button><button onClick={onLogin}>Log in <ArrowUpRight size={14} /></button></div><span>© {new Date().getFullYear()} Quikz</span></footer>
  </div>;
}
