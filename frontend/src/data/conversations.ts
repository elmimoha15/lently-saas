export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  relatedComments?: {
    username: string;
    text: string;
  }[];
  timestamp: string;
}

export interface Conversation {
  videoId: string;
  messages: Message[];
}

export const sampleConversations: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      role: 'ai',
      content: "Hi! I've analyzed all **1,234 comments** for \"How to Code React in 2024\". What would you like to know?",
      timestamp: 'Just now',
    },
  ],
  '2': [
    {
      id: 'm1',
      role: 'ai',
      content: "Hi! I've analyzed all **856 comments** for \"My Morning Routine as a Developer\". What would you like to know?",
      timestamp: 'Just now',
    },
  ],
};

export const sampleAIResponses: Record<string, { response: string; relatedComments: { username: string; text: string }[] }> = {
  'most common questions': {
    response: `Based on my analysis, here are the **top 5 most common questions** from your viewers:

1. **"What IDE theme are you using?"** - 23 variations of this question
2. **"When is your next video coming out?"** - 18 comments asking about upcoming content
3. **"Does this work with React 19?"** - 15 questions about compatibility
4. **"Can you explain the dependency array?"** - 12 requests for more explanation
5. **"What's your camera/mic setup?"** - 9 gear-related questions

💡 **Recommendation:** Consider adding a pinned comment with your setup details and a link to your upcoming content calendar. This could reduce 40% of repetitive questions!`,
    relatedComments: [
      { username: '@learningDaily', text: "What IDE theme are you using? It looks really clean..." },
      { username: '@devJourney', text: "When is your next video coming out? I've been waiting..." },
      { username: '@curiosCoder', text: "Does this work with React 19? I heard they're changing..." },
    ],
  },
  'common complaints': {
    response: `I found **23 complaints** in the comments (12% of total). Here's the breakdown:

**Top Issues:**
1. **Audio quality concerns** - 8 mentions
   - Viewers are having trouble hearing in certain sections
   
2. **Pace too fast** - 6 mentions
   - Some beginners feel lost during the hook explanations
   
3. **Missing topics** - 5 mentions
   - useReducer not covered in depth
   - No mention of custom hooks

4. **Video length** - 4 mentions
   - Some feel it's too long for a "quick" tutorial

📊 **Sentiment trend:** Complaints decreased by 15% compared to your previous React video!

💡 **Quick wins:** Adding timestamps and a "beginner" vs "advanced" label could address the pace concerns.`,
    relatedComments: [
      { username: '@angryViewer', text: "The audio quality is terrible. Can't hear anything properly..." },
      { username: '@reactMaster2024', text: "You should have covered useReducer more in depth..." },
      { username: '@seniorDev', text: "Good overview but you glossed over the dependency array..." },
    ],
  },
  'content ideas': {
    response: `Your audience has suggested **67 content ideas**! Here are the most requested:

🔥 **High Demand (10+ requests):**
1. **React Query / TanStack Query tutorial** - 18 requests
2. **TypeScript with React deep dive** - 15 requests
3. **Advanced patterns (compound components, render props)** - 12 requests

📈 **Medium Demand (5-10 requests):**
4. **React vs Vue comparison** - 8 requests
5. **Testing with React Testing Library** - 7 requests
6. **State management comparison (Redux vs Zustand vs Jotai)** - 6 requests

💡 **Emerging topics:**
- React Server Components (5 mentions)
- AI integration in React apps (4 mentions)

**My recommendation:** A React Query video would likely perform very well given the strong demand and relevance to your current content.`,
    relatedComments: [
      { username: '@frontendNinja', text: "Can you make a follow-up video on React Query?..." },
      { username: '@typescript_fan', text: "Would love to see TypeScript integration in your next video..." },
      { username: '@reactNewbie', text: "Could you make a video comparing React with Vue?..." },
    ],
  },
};

export const suggestedQuestions = [
  "💡 What are viewers most confused about?",
  "💡 What content do they want next?",
  "💡 What are the common complaints?",
  "💡 Show me the best praise comments",
];
