export type PaigeTip = { kind: 'tip' | 'aha'; text: string };
export type PaigeRole = 'student' | 'faculty' | 'admin' | undefined;

const tip = (text: string): PaigeTip => ({ kind: 'tip', text });
const aha = (text: string): PaigeTip => ({ kind: 'aha', text });

/** Page-specific advice. Keys are page contexts; role-specific entries use "context:role". */
const pageTips: Record<string, PaigeTip[]> = {
  home: [
    tip('Tap through the live preview up top to see how a lesson, a quiz and your progress fit together.'),
    tip('Not ready to sign up? Explore subjects and the lesson directory first. No account needed.'),
    aha('Curiosity primes your brain to remember. When you really want to know an answer, you tend to hold on to it longer.'),
  ],
  catalog: [
    tip('Search by subject code, title or instructor to find a course fast.'),
    tip('Use the year-level filter to see the subjects that fit your term.'),
    aha('Choosing what you learn yourself tends to boost motivation. Psychologists call it autonomy.'),
  ],
  lessons: [
    tip('The lesson directory lists lessons across every subject. Skim the summaries to find your next one.'),
    tip('Sign in to open a lesson, take its quiz and save your progress.'),
    aha('Previewing a topic before studying it gives new details a frame to hang on.'),
  ],
  login: [
    tip('You can sign in with either your username or your institutional email.'),
    tip('Use the eye button to check your password before you sign in.'),
    aha('Studying around the same time each day makes it feel automatic sooner. Habits love routine.'),
  ],
  signup: [
    tip('Choose Student or Faculty / Professor first. It shapes your whole workspace.'),
    tip('Give the honor code a real read before you accept. It’s short, and it matters.'),
    aha('Writing down a clear goal, like “finish one module this week”, makes you more likely to follow through.'),
  ],
  'learning:student': [
    tip('Pick up where you left off with “Continue learning” on any course card.'),
    tip('Modules unlock in order. Pass a module’s end quiz to open the next one.'),
    tip('Use the course status filter to see what’s in progress or still waiting for you.'),
  ],
  'learning:faculty': [
    tip('Filter by “Needs end quizzes” to find modules your students can’t finish yet.'),
    tip('Open a course to add modules, attach documents and link each module’s end quiz.'),
    aha('Students learn more when each lesson has one clear big idea. Short and focused beats long and crowded.'),
  ],
  'learning:admin': [
    tip('The catalog shows every subject on Quikz. Open one to review its modules.'),
  ],
  'reading:student': [
    tip('Read the whole lesson before you start the quiz. That’s Paige’s golden rule!'),
    tip('After a quiz, revisit the parts of the lesson behind the questions you missed.'),
    aha('Try explaining the lesson out loud as if you were teaching it. Teaching helps you learn (the protégé effect).'),
  ],
  'reading:faculty': [
    tip('Keep each module focused on one idea. It’s easier to teach, and easier to master.'),
    tip('Every module needs a valid end quiz so students can move on to the next one.'),
    aha('A quick question in the middle of a lesson keeps attention up and checks understanding early.'),
  ],
  'gradebook:student': [
    tip('Look for patterns in what you missed. That’s your next study target.'),
    tip('A lower score is just information. Revisit the lesson, then try again.'),
    aha('Mistakes that get clear feedback are some of the strongest learning moments, especially ones you felt sure about.'),
  ],
  'gradebook:faculty': [
    tip('If many students miss the same module, that lesson might need one more example.'),
    tip('Compare results across modules to see where your class is gaining confidence.'),
  ],
  directory: [
    tip('Jump straight to any lesson from here, across all your subjects.'),
    aha('Mixing related topics in one session, called interleaving, helps you tell ideas apart.'),
  ],
  'my-lessons': [
    tip('Open a subject to create modules, upload files and link end quizzes.'),
    tip('Edit a subject’s details anytime with “Edit subject”.'),
  ],
  'connections:student': [
    tip('Accept your faculty’s invitation so they can follow your progress and help sooner.'),
  ],
  'connections:faculty': [
    tip('Invite students one by one, or upload a CSV roster to invite a whole class at once.'),
  ],
  people: [
    tip('Find classmates and faculty here. Learning is better together.'),
    aha('Talking through a problem with a peer often reveals gaps you didn’t know you had.'),
  ],
  profile: [
    tip('Add a profile photo so your faculty and classmates recognize you.'),
    tip('Keep your details up to date so invitations and results reach the right person.'),
  ],
  users: [tip('Use user management to review accounts and roles across Quikz.')],
  system: [tip('System health shows whether every Quikz service is up and running.')],
};

/** General learning-science “aha” moments, shown on every page. */
const ahaFacts: PaigeTip[] = [
  aha('Quizzing yourself beats rereading. Pulling an idea from memory makes it stick (the testing effect).'),
  aha('Spacing out your study sessions over days helps you remember far longer than one long cram.'),
  aha('Sleep helps your brain organize what you learned today. A rested brain remembers more.'),
  aha('Pairing words with a picture or diagram gives your memory two ways to find an idea.'),
  aha('Short breaks help. Try 25 focused minutes, then a 5-minute stretch.'),
  aha('Asking yourself “why?” and “how?” while you read helps you understand more deeply.'),
  aha('Feeling a little stuck is often a sign you’re learning. Effort that’s challenging but doable helps ideas stick.'),
  aha('Connecting a new idea to something you already know gives it somewhere to stay.'),
];

export function tipsFor(context: string, role: PaigeRole): PaigeTip[] {
  const specific = pageTips[`${context}:${role}`] ?? pageTips[context] ?? [];
  // Start the general facts at a different point per page so they feel fresh.
  const offset = [...context].reduce((n, c) => n + c.charCodeAt(0), 0) % ahaFacts.length;
  const facts = [...ahaFacts.slice(offset), ...ahaFacts.slice(0, offset)];
  const chosen = facts.slice(0, Math.max(specific.length, 4));
  const mixed: PaigeTip[] = [];
  for (let i = 0; i < Math.max(specific.length, chosen.length); i++) {
    if (specific[i]) mixed.push(specific[i]);
    if (chosen[i]) mixed.push(chosen[i]);
  }
  return mixed;
}
