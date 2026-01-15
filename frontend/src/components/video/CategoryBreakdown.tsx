import { motion } from 'framer-motion';

interface CategoryBreakdownProps {
  categories: {
    questions: number;
    praise: number;
    complaints: number;
    suggestions: number;
    spam: number;
    general: number;
  };
}

const categoryConfig = [
  { key: 'questions', label: 'Questions', emoji: '❓', color: 'hsl(224, 76%, 48%)' },
  { key: 'praise', label: 'Praise', emoji: '👏', color: 'hsl(160, 84%, 20%)' },
  { key: 'complaints', label: 'Complaints', emoji: '😞', color: 'hsl(0, 84%, 60%)' },
  { key: 'suggestions', label: 'Suggestions', emoji: '💡', color: 'hsl(263, 70%, 50%)' },
  { key: 'spam', label: 'Spam', emoji: '🗑️', color: 'hsl(220, 9%, 46%)' },
];

export const CategoryBreakdown = ({ categories }: CategoryBreakdownProps) => {
  const maxValue = Math.max(...Object.values(categories));

  return (
    <div className="space-y-4">
      {categoryConfig.map((cat, index) => {
        const value = categories[cat.key as keyof typeof categories];
        const percentage = (value / maxValue) * 100;

        return (
          <div key={cat.key} className="flex items-center gap-4">
            <span className="text-lg w-6">{cat.emoji}</span>
            <span className="text-sm text-muted-foreground w-24">{cat.label}</span>
            <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
};
