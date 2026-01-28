import { motion } from 'framer-motion';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const FadeIn = ({ children, className = '', delay = 0, direction = 'up' }: FadeInProps) => {
  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0, 
        ...directionOffset[direction],
        filter: 'blur(10px)',
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
};
