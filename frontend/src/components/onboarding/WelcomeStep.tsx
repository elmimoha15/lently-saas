import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  userName?: string;
  onNext: () => void;
}

export const WelcomeStep = ({ userName, onNext }: WelcomeStepProps) => {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
      >
        <Flame className="w-10 h-10 text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold mb-4">
        Welcome{userName ? `, ${userName}` : ''}! 🎉
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
        Let's set up your account so you can start understanding your YouTube audience.
      </p>

      <Button onClick={onNext} className="btn-primary h-14 px-8 text-base gap-2">
        Get Started <ArrowRight className="w-5 h-5" />
      </Button>
    </motion.div>
  );
};
