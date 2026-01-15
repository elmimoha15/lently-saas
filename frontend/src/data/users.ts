export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'pro' | 'business';
  createdAt: string;
  usage: {
    videosAnalyzed: number;
    videosLimit: number;
    aiQuestions: number;
    aiQuestionsLimit: number;
    commentsAnalyzed: number;
    commentsLimit: number;
    resetDate: string;
  };
  preferences: {
    emailNotifications: boolean;
    monthlyReports: boolean;
    betaFeatures: boolean;
  };
}

export const currentUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'free',
  createdAt: '2025-12-01',
  usage: {
    videosAnalyzed: 2,
    videosLimit: 3,
    aiQuestions: 1,
    aiQuestionsLimit: 3,
    commentsAnalyzed: 180,
    commentsLimit: 100,
    resetDate: '2026-02-01',
  },
  preferences: {
    emailNotifications: true,
    monthlyReports: true,
    betaFeatures: false,
  },
};

export const getPlanBadgeClass = (plan: User['plan']) => {
  switch (plan) {
    case 'free':
      return 'badge-free';
    case 'starter':
      return 'badge-starter';
    case 'pro':
      return 'badge-pro';
    case 'business':
      return 'badge-business';
    default:
      return 'badge-free';
  }
};
