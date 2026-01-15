export interface Video {
  id: string;
  title: string;
  channel: string;
  channelVerified: boolean;
  thumbnail: string;
  commentCount: number;
  publishedAt: string;
  analyzedAt: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categories: {
    questions: number;
    praise: number;
    complaints: number;
    suggestions: number;
    spam: number;
    general: number;
  };
  topics: string[];
}

export const videos: Video[] = [
  {
    id: '1',
    title: 'How to Code React in 2024 - Complete Beginner Guide',
    channel: 'TechChannel',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640&h=360&fit=crop',
    commentCount: 1234,
    publishedAt: '2026-01-05',
    analyzedAt: '2026-01-10',
    sentiment: { positive: 68, neutral: 20, negative: 12 },
    categories: { questions: 45, praise: 128, complaints: 23, suggestions: 67, spam: 12, general: 959 },
    topics: ['React Hooks', 'TypeScript', 'Best Practices', 'Performance', 'State Management', 'Components'],
  },
  {
    id: '2',
    title: 'My Morning Routine as a Developer - Day in My Life',
    channel: 'DevLife',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&h=360&fit=crop',
    commentCount: 856,
    publishedAt: '2026-01-02',
    analyzedAt: '2026-01-08',
    sentiment: { positive: 82, neutral: 12, negative: 6 },
    categories: { questions: 34, praise: 245, complaints: 8, suggestions: 42, spam: 5, general: 522 },
    topics: ['Morning Routine', 'Productivity', 'Work-Life Balance', 'Home Office', 'Coffee'],
  },
  {
    id: '3',
    title: 'Building a SaaS from Scratch - Week 1 Progress',
    channel: 'IndieHacker',
    channelVerified: false,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&h=360&fit=crop',
    commentCount: 2341,
    publishedAt: '2025-12-28',
    analyzedAt: '2026-01-05',
    sentiment: { positive: 72, neutral: 18, negative: 10 },
    categories: { questions: 156, praise: 189, complaints: 45, suggestions: 234, spam: 23, general: 1694 },
    topics: ['SaaS', 'Startup', 'Indie Hacking', 'Marketing', 'Revenue', 'Tech Stack'],
  },
  {
    id: '4',
    title: 'The Ultimate VS Code Setup 2024 - Extensions & Themes',
    channel: 'CodeWithMe',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=640&h=360&fit=crop',
    commentCount: 3456,
    publishedAt: '2025-12-20',
    analyzedAt: '2026-01-02',
    sentiment: { positive: 78, neutral: 15, negative: 7 },
    categories: { questions: 234, praise: 456, complaints: 67, suggestions: 189, spam: 34, general: 2476 },
    topics: ['VS Code', 'Extensions', 'Themes', 'Productivity', 'Developer Tools'],
  },
  {
    id: '5',
    title: 'Why I Quit My $200k Job to Build Startups',
    channel: 'TechEntrepreneur',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=640&h=360&fit=crop',
    commentCount: 4521,
    publishedAt: '2025-12-15',
    analyzedAt: '2025-12-28',
    sentiment: { positive: 55, neutral: 25, negative: 20 },
    categories: { questions: 345, praise: 234, complaints: 156, suggestions: 123, spam: 45, general: 3618 },
    topics: ['Career', 'Startups', 'Money', 'Risk', 'Entrepreneurship', 'Life Decisions'],
  },
  {
    id: '6',
    title: 'Next.js 15 Complete Tutorial - App Router Explained',
    channel: 'WebDevSimplified',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&h=360&fit=crop',
    commentCount: 2890,
    publishedAt: '2025-12-10',
    analyzedAt: '2025-12-22',
    sentiment: { positive: 74, neutral: 18, negative: 8 },
    categories: { questions: 189, praise: 345, complaints: 34, suggestions: 156, spam: 18, general: 2148 },
    topics: ['Next.js', 'App Router', 'React', 'Server Components', 'Performance'],
  },
  {
    id: '7',
    title: 'I Made $50k Last Month from YouTube - Full Breakdown',
    channel: 'CreatorEconomy',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop',
    commentCount: 5678,
    publishedAt: '2025-12-05',
    analyzedAt: '2025-12-18',
    sentiment: { positive: 45, neutral: 30, negative: 25 },
    categories: { questions: 567, praise: 123, complaints: 234, suggestions: 89, spam: 78, general: 4587 },
    topics: ['YouTube Money', 'Income', 'Creator', 'Monetization', 'Revenue'],
  },
  {
    id: '8',
    title: 'Learn TypeScript in 1 Hour - Crash Course',
    channel: 'Fireship',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=640&h=360&fit=crop',
    commentCount: 1567,
    publishedAt: '2025-12-01',
    analyzedAt: '2025-12-15',
    sentiment: { positive: 85, neutral: 10, negative: 5 },
    categories: { questions: 78, praise: 456, complaints: 12, suggestions: 67, spam: 8, general: 946 },
    topics: ['TypeScript', 'JavaScript', 'Types', 'Generics', 'Interfaces'],
  },
  {
    id: '9',
    title: 'Cooking with AI - Can GPT-4 Make a Michelin Star Dish?',
    channel: 'TechFoodie',
    channelVerified: false,
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=640&h=360&fit=crop',
    commentCount: 789,
    publishedAt: '2025-11-28',
    analyzedAt: '2025-12-10',
    sentiment: { positive: 72, neutral: 20, negative: 8 },
    categories: { questions: 45, praise: 167, complaints: 23, suggestions: 89, spam: 5, general: 460 },
    topics: ['AI', 'Cooking', 'Food', 'GPT-4', 'Experiment'],
  },
  {
    id: '10',
    title: 'Gaming Setup Tour 2024 - $10,000 Budget',
    channel: 'GamerProMax',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=640&h=360&fit=crop',
    commentCount: 3245,
    publishedAt: '2025-11-25',
    analyzedAt: '2025-12-08',
    sentiment: { positive: 68, neutral: 22, negative: 10 },
    categories: { questions: 234, praise: 345, complaints: 67, suggestions: 123, spam: 45, general: 2431 },
    topics: ['Gaming', 'Setup', 'PC Build', 'Monitors', 'Peripherals', 'RGB'],
  },
  {
    id: '11',
    title: 'How I Study 10 Hours a Day Without Burning Out',
    channel: 'StudyWithMike',
    channelVerified: false,
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=640&h=360&fit=crop',
    commentCount: 1890,
    publishedAt: '2025-11-20',
    analyzedAt: '2025-12-05',
    sentiment: { positive: 76, neutral: 16, negative: 8 },
    categories: { questions: 156, praise: 267, complaints: 34, suggestions: 189, spam: 12, general: 1232 },
    topics: ['Study', 'Productivity', 'Focus', 'Learning', 'Discipline'],
  },
  {
    id: '12',
    title: 'Tailwind CSS vs CSS Modules - Which One Should You Use?',
    channel: 'CSSWizard',
    channelVerified: true,
    thumbnail: 'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=640&h=360&fit=crop',
    commentCount: 2156,
    publishedAt: '2025-11-15',
    analyzedAt: '2025-11-30',
    sentiment: { positive: 52, neutral: 28, negative: 20 },
    categories: { questions: 189, praise: 156, complaints: 123, suggestions: 234, spam: 34, general: 1420 },
    topics: ['Tailwind', 'CSS Modules', 'Styling', 'Web Development', 'Frontend'],
  },
];

export const getVideoById = (id: string): Video | undefined => {
  return videos.find((v) => v.id === id);
};

export const getRecentVideos = (count: number = 3): Video[] => {
  return videos.slice(0, count);
};
