export type CommentCategory = 'question' | 'praise' | 'complaint' | 'suggestion' | 'spam' | 'general';
export type CommentSentiment = 'positive' | 'neutral' | 'negative';

export interface Comment {
  id: string;
  videoId: string;
  username: string;
  avatar?: string;
  text: string;
  category: CommentCategory;
  sentiment: CommentSentiment;
  likes: number;
  timestamp: string;
}

export const comments: Comment[] = [
  // Video 1 Comments
  {
    id: 'c1',
    videoId: '1',
    username: '@techfan123',
    text: "This is the best React tutorial I've ever watched! Finally someone explains hooks in a way that makes sense. Subscribed!",
    category: 'praise',
    sentiment: 'positive',
    likes: 234,
    timestamp: '2 days ago',
  },
  {
    id: 'c2',
    videoId: '1',
    username: '@newbieDev',
    text: "Quick question - at 5:23 when you destructure props, why didn't you use the spread operator? Is there a performance difference?",
    category: 'question',
    sentiment: 'neutral',
    likes: 45,
    timestamp: '2 days ago',
  },
  {
    id: 'c3',
    videoId: '1',
    username: '@reactMaster2024',
    text: "You should have covered useReducer more in depth. The example was too simple and doesn't show real-world use cases.",
    category: 'complaint',
    sentiment: 'negative',
    likes: 12,
    timestamp: '3 days ago',
  },
  {
    id: 'c4',
    videoId: '1',
    username: '@frontendNinja',
    text: 'Can you make a follow-up video on React Query? Would love to see how you integrate data fetching with these patterns.',
    category: 'suggestion',
    sentiment: 'positive',
    likes: 189,
    timestamp: '3 days ago',
  },
  {
    id: 'c5',
    videoId: '1',
    username: '@codeNewbie',
    text: "I've been struggling with useState for weeks, and this video finally made it click! The visualization at 12:30 was perfect.",
    category: 'praise',
    sentiment: 'positive',
    likes: 156,
    timestamp: '4 days ago',
  },
  {
    id: 'c6',
    videoId: '1',
    username: '@devJourney',
    text: "When is your next video coming out? I've been waiting for the advanced patterns tutorial you mentioned.",
    category: 'question',
    sentiment: 'neutral',
    likes: 67,
    timestamp: '4 days ago',
  },
  {
    id: 'c7',
    videoId: '1',
    username: '@typescript_fan',
    text: 'Would love to see TypeScript integration in your next video. The types for custom hooks can be tricky.',
    category: 'suggestion',
    sentiment: 'positive',
    likes: 98,
    timestamp: '5 days ago',
  },
  {
    id: 'c8',
    videoId: '1',
    username: '@angryViewer',
    text: "The audio quality is terrible. Can't hear anything properly. Please invest in a better mic.",
    category: 'complaint',
    sentiment: 'negative',
    likes: 5,
    timestamp: '5 days ago',
  },
  {
    id: 'c9',
    videoId: '1',
    username: '@webDevPro',
    text: "Been coding for 10 years and I still learned something new today. Great content!",
    category: 'praise',
    sentiment: 'positive',
    likes: 312,
    timestamp: '6 days ago',
  },
  {
    id: 'c10',
    videoId: '1',
    username: '@spammer123',
    text: 'Check out my channel for FREE crypto tips! 🚀🚀🚀 Click my profile!',
    category: 'spam',
    sentiment: 'neutral',
    likes: 0,
    timestamp: '6 days ago',
  },
  {
    id: 'c11',
    videoId: '1',
    username: '@learningDaily',
    text: "What IDE theme are you using? It looks really clean and easy on the eyes.",
    category: 'question',
    sentiment: 'neutral',
    likes: 34,
    timestamp: '7 days ago',
  },
  {
    id: 'c12',
    videoId: '1',
    username: '@bootcampGrad',
    text: 'This video helped me land my first dev job! The interviewer asked about hooks and I nailed it thanks to you.',
    category: 'praise',
    sentiment: 'positive',
    likes: 456,
    timestamp: '8 days ago',
  },
  {
    id: 'c13',
    videoId: '1',
    username: '@seniorDev',
    text: "Good overview but you glossed over the dependency array pitfalls. That's where most bugs happen.",
    category: 'complaint',
    sentiment: 'negative',
    likes: 23,
    timestamp: '8 days ago',
  },
  {
    id: 'c14',
    videoId: '1',
    username: '@reactNewbie',
    text: 'Could you make a video comparing React with Vue? Trying to decide which to learn first.',
    category: 'suggestion',
    sentiment: 'neutral',
    likes: 78,
    timestamp: '9 days ago',
  },
  {
    id: 'c15',
    videoId: '1',
    username: '@curiosCoder',
    text: "Does this work with React 19? I heard they're changing some things with hooks.",
    category: 'question',
    sentiment: 'neutral',
    likes: 56,
    timestamp: '9 days ago',
  },
  // Video 2 Comments
  {
    id: 'c16',
    videoId: '2',
    username: '@morningPerson',
    text: "Love your energy! That coffee setup is goals. What brand of coffee maker is that?",
    category: 'praise',
    sentiment: 'positive',
    likes: 123,
    timestamp: '1 day ago',
  },
  {
    id: 'c17',
    videoId: '2',
    username: '@nightOwlCoder',
    text: 'How do you wake up so early? I code until 3am and can barely function before noon.',
    category: 'question',
    sentiment: 'neutral',
    likes: 89,
    timestamp: '2 days ago',
  },
  {
    id: 'c18',
    videoId: '2',
    username: '@productivityGuru',
    text: 'Try adding a 5-minute meditation after your morning stretch. Game changer for focus!',
    category: 'suggestion',
    sentiment: 'positive',
    likes: 67,
    timestamp: '3 days ago',
  },
  {
    id: 'c19',
    videoId: '2',
    username: '@realisticViewer',
    text: "This seems staged. No way you're this productive every single day. Be more authentic.",
    category: 'complaint',
    sentiment: 'negative',
    likes: 15,
    timestamp: '4 days ago',
  },
  {
    id: 'c20',
    videoId: '2',
    username: '@inspiredDev',
    text: 'Started implementing your routine last week and already feeling more productive. Thank you!',
    category: 'praise',
    sentiment: 'positive',
    likes: 234,
    timestamp: '5 days ago',
  },
  // More general comments for various videos
  {
    id: 'c21',
    videoId: '3',
    username: '@startupFounder',
    text: 'Week 1 and already sharing? Love the transparency. What tech stack did you go with?',
    category: 'question',
    sentiment: 'positive',
    likes: 145,
    timestamp: '3 days ago',
  },
  {
    id: 'c22',
    videoId: '3',
    username: '@indieDevJohn',
    text: 'Been on this journey for 6 months now. It gets harder but also more rewarding. Keep going!',
    category: 'praise',
    sentiment: 'positive',
    likes: 278,
    timestamp: '4 days ago',
  },
  {
    id: 'c23',
    videoId: '4',
    username: '@vimUser',
    text: 'VS Code? Real devs use Vim. This is for beginners only.',
    category: 'complaint',
    sentiment: 'negative',
    likes: 8,
    timestamp: '5 days ago',
  },
  {
    id: 'c24',
    videoId: '4',
    username: '@pragmaticDev',
    text: 'The GitLens extension you showed is amazing! Been looking for something like this for months.',
    category: 'praise',
    sentiment: 'positive',
    likes: 189,
    timestamp: '6 days ago',
  },
  {
    id: 'c25',
    videoId: '5',
    username: '@skepticalViewer',
    text: "Easy to quit when you have savings. Not everyone has that privilege. Title is misleading.",
    category: 'complaint',
    sentiment: 'negative',
    likes: 456,
    timestamp: '7 days ago',
  },
  {
    id: 'c26',
    videoId: '5',
    username: '@aspiringFounder',
    text: 'This gave me the push I needed. Putting in my two weeks notice tomorrow. Wish me luck!',
    category: 'praise',
    sentiment: 'positive',
    likes: 345,
    timestamp: '8 days ago',
  },
  {
    id: 'c27',
    videoId: '6',
    username: '@nextjsNewbie',
    text: "Finally understand server components! The diagram at 15:00 should be in the official docs.",
    category: 'praise',
    sentiment: 'positive',
    likes: 567,
    timestamp: '2 days ago',
  },
  {
    id: 'c28',
    videoId: '6',
    username: '@reactVeteran',
    text: "How does this compare to Remix's approach? They seem to have similar philosophies.",
    category: 'question',
    sentiment: 'neutral',
    likes: 89,
    timestamp: '3 days ago',
  },
  {
    id: 'c29',
    videoId: '7',
    username: '@jealousCreator',
    text: "$50k in one month?! I've been on YouTube for 3 years and barely make $500. What am I doing wrong?",
    category: 'question',
    sentiment: 'negative',
    likes: 234,
    timestamp: '4 days ago',
  },
  {
    id: 'c30',
    videoId: '7',
    username: '@supportiveFan',
    text: 'You deserve every penny. The value you provide is immense. Keep inspiring us!',
    category: 'praise',
    sentiment: 'positive',
    likes: 123,
    timestamp: '5 days ago',
  },
];

export const getCommentsByVideoId = (videoId: string): Comment[] => {
  return comments.filter((c) => c.videoId === videoId);
};

export const getCommentsByCategory = (videoId: string, category: CommentCategory): Comment[] => {
  return comments.filter((c) => c.videoId === videoId && c.category === category);
};

export const getCategoryBadgeClass = (category: CommentCategory): string => {
  switch (category) {
    case 'question':
      return 'badge-question';
    case 'praise':
      return 'badge-praise';
    case 'complaint':
      return 'badge-complaint';
    case 'suggestion':
      return 'badge-suggestion';
    default:
      return 'badge-free';
  }
};

export const getSentimentEmoji = (sentiment: CommentSentiment): string => {
  switch (sentiment) {
    case 'positive':
      return '😊';
    case 'neutral':
      return '😐';
    case 'negative':
      return '😔';
  }
};
