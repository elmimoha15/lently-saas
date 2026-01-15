export type TemplateCategory = 'general' | 'faq' | 'praise' | 'complaint' | 'request' | 'other';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  usageCount: number;
  createdAt: string;
}

export const templates: Template[] = [
  {
    id: 't1',
    name: 'Thank You Reply',
    category: 'general',
    content: "Thanks so much for watching! ❤️ Your support means the world to me. If you found this helpful, consider subscribing for more content like this!",
    usageCount: 45,
    createdAt: '2025-12-15',
  },
  {
    id: 't2',
    name: 'Answer FAQ',
    category: 'faq',
    content: "Great question! I actually covered this in more detail in my previous video [LINK]. But in short, [ANSWER]. Let me know if that clears things up!",
    usageCount: 28,
    createdAt: '2025-12-10',
  },
  {
    id: 't3',
    name: 'Tutorial Request',
    category: 'request',
    content: "I'll definitely consider making a video about that! I've added it to my content calendar. Make sure you're subscribed so you don't miss it when it drops! 🔔",
    usageCount: 34,
    createdAt: '2025-12-05',
  },
  {
    id: 't4',
    name: 'Constructive Response',
    category: 'complaint',
    content: "Thanks for the feedback! I really appreciate you taking the time to share your thoughts. I'm always looking to improve, and I'll definitely keep this in mind for future videos.",
    usageCount: 12,
    createdAt: '2025-11-28',
  },
  {
    id: 't5',
    name: 'Camera Question',
    category: 'faq',
    content: "I'm currently using the Sony A7IV with a 24-70mm f/2.8 lens. For lighting, I use two Elgato Key Lights. Happy to do a full setup video if there's interest!",
    usageCount: 56,
    createdAt: '2025-11-20',
  },
];

export const templateCategoryLabels: Record<TemplateCategory, string> = {
  general: 'General',
  faq: 'FAQ',
  praise: 'Praise',
  complaint: 'Feedback',
  request: 'Requests',
  other: 'Other',
};

export const getTemplateCategoryClass = (category: TemplateCategory): string => {
  switch (category) {
    case 'faq':
      return 'badge-question';
    case 'praise':
      return 'badge-praise';
    case 'complaint':
      return 'badge-complaint';
    case 'request':
      return 'badge-suggestion';
    default:
      return 'badge-free';
  }
};
