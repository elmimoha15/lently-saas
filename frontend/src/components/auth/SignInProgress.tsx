import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SignInProgressProps {
  userName?: string;
  message?: string;
}

export const SignInProgress = ({ userName, message = 'Signing you in' }: SignInProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar from 0 to 98% smoothly
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = 98 / steps;
    const interval = duration / steps;

    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 98) {
        setProgress(98);
        clearInterval(timer);
      } else {
        setProgress(currentProgress);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Signing you in text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {message}
          </h1>
        </motion.div>

        {/* Progress Bar - Apple style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-1 bg-border/30 rounded-full overflow-hidden"
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-foreground rounded-full"
            style={{
              width: `${progress}%`,
            }}
            transition={{
              width: { duration: 0.3, ease: 'easeOut' },
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};
