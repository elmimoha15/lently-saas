import { motion } from 'framer-motion';

interface TopicPillsProps {
  topics: string[];
}

export const TopicPills = ({ topics }: TopicPillsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, index) => (
        <motion.button
          key={topic}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05, borderColor: 'hsl(0, 100%, 50%)' }}
          className="px-4 py-2 bg-card border border-border rounded-full text-sm font-medium text-foreground hover:border-primary transition-colors"
        >
          {topic}
        </motion.button>
      ))}
    </div>
  );
};
