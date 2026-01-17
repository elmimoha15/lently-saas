import { motion } from 'framer-motion';
import { ArrowRight, Check, Users, MessageSquare, Lightbulb, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const goals = [
  { id: 'understand', icon: Users, label: 'Understand my audience better' },
  { id: 'questions', icon: MessageSquare, label: 'Find common questions to answer' },
  { id: 'ideas', icon: Lightbulb, label: 'Get content ideas from comments' },
  { id: 'sentiment', icon: BarChart3, label: 'Track sentiment over time' },
  { id: 'grow', icon: TrendingUp, label: 'Grow my channel faster' },
];

interface GoalsStepProps {
  selectedGoals: string[];
  onToggle: (goalId: string) => void;
  onNext: () => void;
}

export const GoalsStep = ({ selectedGoals, onToggle, onNext }: GoalsStepProps) => {
  return (
    <motion.div
      key="goals"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">What do you want to achieve?</h1>
        <p className="text-muted-foreground">Select all that apply</p>
      </div>

      <div className="space-y-3 mb-8">
        {goals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              onClick={() => onToggle(goal.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <goal.icon className="w-6 h-6" />
              </div>
              <span className="flex-1 text-left font-medium">{goal.label}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        disabled={selectedGoals.length === 0}
        className="btn-primary w-full h-14 text-base gap-2"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </Button>
    </motion.div>
  );
};
