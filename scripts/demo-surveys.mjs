/**
 * Demo content for the seed script: one entry per survey with its questions, answers and
 * a vote distribution.
 *
 * `endsInDays` is relative to the seeding run. A negative value makes a survey that has
 * already ended; those are seeded without votes, because the RLS policy
 * "vote on running surveys" rejects any vote once `ends_at` has passed and anon may not
 * update a survey afterwards to backdate it.
 */
export const DEMO_SURVEYS = [
  {
    title: 'Team Event 2026 – Let´s Plan It Together',
    description:
      'We want to create team activities that everyone will enjoy — share your preferences and ' +
      'ideas in our survey to help us plan better experiences together.',
    category: 'Team Activities',
    endsInDays: 21,
    questions: [
      {
        text: 'Which date would work best for you?',
        allowMultiple: true,
        options: [
          { text: '19.09.2026, Friday', votes: 12 },
          { text: '10.10.2026, Friday', votes: 19 },
          { text: '11.10.2026, Saturday', votes: 7 },
          { text: '31.10.2026, Friday', votes: 15 },
        ],
      },
      {
        text: 'Choose the activities you prefer',
        allowMultiple: true,
        options: [
          { text: 'Outdoor adventure like kayaking', votes: 14 },
          { text: 'Office costume party', votes: 5 },
          { text: 'Bowling, mini-golf, volleyball', votes: 11 },
          { text: 'Beach party, music & cocktails', votes: 18 },
        ],
      },
      {
        text: 'How long should the event last?',
        allowMultiple: false,
        options: [
          { text: 'An afternoon', votes: 4 },
          { text: 'A full day', votes: 13 },
          { text: 'An evening with dinner', votes: 9 },
          { text: 'A whole weekend', votes: 6 },
        ],
      },
      {
        text: 'What is a fair budget per person?',
        allowMultiple: false,
        options: [
          { text: 'Up to 25 €', votes: 3 },
          { text: '25 – 50 €', votes: 16 },
          { text: '50 – 100 €', votes: 10 },
          { text: 'More than 100 €', votes: 2 },
        ],
      },
    ],
  },
  {
    title: 'How can we improve our workplace wellbeing?',
    description:
      'Healthy days make better work. Tell us which offers would actually fit into your week ' +
      'so we can spend the wellbeing budget where it helps most.',
    category: 'Health & Wellness',
    endsInDays: 3,
    questions: [
      {
        text: 'Which offers would you use regularly?',
        allowMultiple: true,
        options: [
          { text: 'Subsidised gym membership', votes: 21 },
          { text: 'Weekly yoga in the office', votes: 13 },
          { text: 'Running group before work', votes: 6 },
          { text: 'Massage days once a month', votes: 24 },
        ],
      },
      {
        text: 'When should wellbeing activities take place?',
        allowMultiple: false,
        options: [
          { text: 'Before work', votes: 5 },
          { text: 'During the lunch break', votes: 18 },
          { text: 'Right after work', votes: 14 },
          { text: 'On the weekend', votes: 2 },
        ],
      },
      {
        text: 'What keeps you from taking breaks?',
        allowMultiple: true,
        options: [
          { text: 'Too many meetings', votes: 22 },
          { text: 'Deadlines', votes: 17 },
          { text: 'No quiet place to go', votes: 9 },
          { text: 'Nothing, I take my breaks', votes: 7 },
        ],
      },
    ],
  },
  {
    title: 'Game night: what should we play?',
    description:
      'The next game night needs a plan. Pick the games and the format you would actually ' +
      'show up for.',
    category: 'Gaming & Entertainment',
    endsInDays: -9,
    questions: [
      {
        text: 'Which games should be on the table?',
        allowMultiple: true,
        options: [
          { text: 'Classic board games', votes: 16 },
          { text: 'Party games like quiz rounds', votes: 23 },
          { text: 'Retro console tournament', votes: 11 },
          { text: 'Pen & paper role playing', votes: 8 },
          { text: 'Escape room in a box', votes: 19 },
        ],
      },
      {
        text: 'How often should game night happen?',
        allowMultiple: false,
        options: [
          { text: 'Every week', votes: 3 },
          { text: 'Every two weeks', votes: 9 },
          { text: 'Once a month', votes: 26 },
          { text: 'Once a quarter', votes: 7 },
        ],
      },
      {
        text: 'Should game night be remote-friendly?',
        allowMultiple: false,
        options: [
          { text: 'Yes, always include an online option', votes: 20 },
          { text: 'Only for the bigger events', votes: 13 },
          { text: 'No, on-site is the point', votes: 10 },
        ],
      },
    ],
  },
  {
    title: 'Which skills should our next workshops cover?',
    description:
      'We have budget for four internal workshops this year. Help us pick the topics and the ' +
      'format that fit your learning goals.',
    category: 'Education & Learning',
    endsInDays: 12,
    questions: [
      {
        text: 'Which topics interest you most?',
        allowMultiple: true,
        options: [
          { text: 'Accessibility in practice', votes: 18 },
          { text: 'Testing and test automation', votes: 22 },
          { text: 'Design systems', votes: 15 },
          { text: 'Public speaking', votes: 9 },
          { text: 'Data privacy and security', votes: 12 },
        ],
      },
      {
        text: 'Which format works best for you?',
        allowMultiple: false,
        options: [
          { text: 'Half-day hands-on workshop', votes: 24 },
          { text: 'A series of short sessions', votes: 17 },
          { text: 'Full-day deep dive', votes: 8 },
          { text: 'Self-paced with a study group', votes: 6 },
        ],
      },
      {
        text: 'Who should run the workshops?',
        allowMultiple: false,
        options: [
          { text: 'Colleagues from the team', votes: 19 },
          { text: 'External trainers', votes: 21 },
          { text: 'A mix of both', votes: 28 },
        ],
      },
    ],
  },
  {
    title: 'Coffee, snacks and the office kitchen',
    description:
      'The kitchen order is up for renewal. Tell us what should stay, what should go and what ' +
      'is missing.',
    category: 'Lifestyle & Preferences',
    endsInDays: 30,
    questions: [
      {
        text: 'What should always be stocked?',
        allowMultiple: true,
        options: [
          { text: 'Good filter coffee', votes: 27 },
          { text: 'Oat and other plant milks', votes: 19 },
          { text: 'Fresh fruit', votes: 25 },
          { text: 'Sparkling water', votes: 22 },
          { text: 'Sweet snacks', votes: 14 },
        ],
      },
      {
        text: 'How should we handle lunch together?',
        allowMultiple: false,
        options: [
          { text: 'A fixed team lunch every week', votes: 16 },
          { text: 'Spontaneous, whoever is around', votes: 23 },
          { text: 'Order in once a month', votes: 11 },
          { text: 'No organised lunch, thanks', votes: 5 },
        ],
      },
    ],
  },
  {
    title: 'Which tools should we adopt in 2026?',
    description:
      'Our tooling has grown organically. Help us decide where to invest and what to retire ' +
      'before the next planning round.',
    category: 'Technology & Innovation',
    endsInDays: 45,
    questions: [
      {
        text: 'Where do you lose the most time today?',
        allowMultiple: true,
        options: [
          { text: 'Switching between too many tools', votes: 26 },
          { text: 'Slow local builds', votes: 18 },
          { text: 'Manual release steps', votes: 21 },
          { text: 'Finding documentation', votes: 24 },
        ],
      },
      {
        text: 'Which investment should come first?',
        allowMultiple: false,
        options: [
          { text: 'A shared design and component library', votes: 20 },
          { text: 'Better CI and preview deployments', votes: 27 },
          { text: 'Monitoring and error tracking', votes: 12 },
          { text: 'An internal documentation hub', votes: 15 },
        ],
      },
      {
        text: 'How should we evaluate new tools?',
        allowMultiple: false,
        options: [
          { text: 'A time-boxed trial per team', votes: 25 },
          { text: 'One team decides for everyone', votes: 6 },
          { text: 'A written proposal and a vote', votes: 18 },
        ],
      },
    ],
  },
  {
    title: 'Summer party 2026: which location won?',
    description:
      'The vote on this year´s summer party is closed. Thanks to everyone who took part — the ' +
      'result decided where we went.',
    category: 'Team Activities',
    endsInDays: -23,
    questions: [
      {
        text: 'Where should the summer party take place?',
        allowMultiple: false,
        options: [
          { text: 'The lake house outside town', votes: 0 },
          { text: 'A rooftop bar in the centre', votes: 0 },
          { text: 'The courtyard behind the office', votes: 0 },
          { text: 'A day trip with a barbecue', votes: 0 },
        ],
      },
      {
        text: 'How long should the evening run?',
        allowMultiple: false,
        options: [
          { text: 'Afternoon into the evening', votes: 0 },
          { text: 'Evening only', votes: 0 },
          { text: 'The whole day', votes: 0 },
        ],
      },
    ],
  },
  {
    title: 'How did your onboarding go?',
    description:
      'A look back at the first weeks of our latest joiners. The survey has closed, the answers ' +
      'feed into the next round of the onboarding plan.',
    category: 'Education & Learning',
    endsInDays: -4,
    questions: [
      {
        text: 'What helped you most in your first weeks?',
        allowMultiple: true,
        options: [
          { text: 'A buddy to ask anything', votes: 0 },
          { text: 'A written onboarding checklist', votes: 0 },
          { text: 'Pairing on a real task early', votes: 0 },
          { text: 'Regular check-ins with the lead', votes: 0 },
        ],
      },
      {
        text: 'What was missing?',
        allowMultiple: true,
        options: [
          { text: 'An overview of who does what', votes: 0 },
          { text: 'Access to tools on day one', votes: 0 },
          { text: 'More context on the product', votes: 0 },
          { text: 'Nothing, it went well', votes: 0 },
        ],
      },
    ],
  },
  {
    title: 'Movie night: what should we watch?',
    description:
      'The projector is booked for next month. Pick the genre, the evening and how we handle ' +
      'the snack budget.',
    category: 'Gaming & Entertainment',
    endsInDays: 9,
    questions: [
      {
        text: 'Which genre should we start with?',
        allowMultiple: true,
        options: [
          { text: 'Science fiction', votes: 21 },
          { text: 'Comedy', votes: 26 },
          { text: 'Documentary', votes: 9 },
          { text: 'Animation', votes: 17 },
          { text: 'Thriller', votes: 13 },
        ],
      },
      {
        text: 'Which evening suits you best?',
        allowMultiple: false,
        options: [
          { text: 'Tuesday', votes: 7 },
          { text: 'Wednesday', votes: 12 },
          { text: 'Thursday', votes: 24 },
          { text: 'Friday', votes: 18 },
        ],
      },
      {
        text: 'How should we handle snacks?',
        allowMultiple: false,
        options: [
          { text: 'Everyone brings something', votes: 22 },
          { text: 'Order in together', votes: 19 },
          { text: 'Company covers it', votes: 25 },
        ],
      },
    ],
  },
  {
    title: 'How should we run our retrospectives?',
    description:
      'Our retro format has not changed in two years. Tell us what is worth keeping and what ' +
      'should be tried differently.',
    category: 'Education & Learning',
    endsInDays: 27,
    questions: [
      {
        text: 'How often should we hold a retro?',
        allowMultiple: false,
        options: [
          { text: 'Every sprint', votes: 28 },
          { text: 'Every second sprint', votes: 14 },
          { text: 'Once a month', votes: 11 },
          { text: 'Only when something went wrong', votes: 4 },
        ],
      },
      {
        text: 'What would make retros more useful?',
        allowMultiple: true,
        options: [
          { text: 'A rotating facilitator', votes: 20 },
          { text: 'Following up on last time´s actions', votes: 31 },
          { text: 'A shorter, tighter format', votes: 16 },
          { text: 'Collecting notes during the sprint', votes: 23 },
        ],
      },
      {
        text: 'How long should a retro take?',
        allowMultiple: false,
        options: [
          { text: '30 minutes', votes: 18 },
          { text: '45 minutes', votes: 26 },
          { text: 'A full hour', votes: 10 },
        ],
      },
    ],
  },
];
