import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QuickStatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isText?: boolean;
}

export const QuickStatCard = ({ title, value, icon, trend, isText }: QuickStatCardProps) => {
  const [displayValue, setDisplayValue] = useState(isText ? value : '0');

  useEffect(() => {
    if (isText) return;

    const numericValue = parseInt(value.replace(/,/g, ''));
    const duration = 1000;
    const steps = 30;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current).toLocaleString() + (value.includes('%') ? '%' : ''));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isText]);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card-premium"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-medium">{trend.value}%</span>
          </div>
        )}
      </div>
      
      <p className={`mt-4 font-bold ${isText ? 'text-lg' : 'text-3xl'} text-foreground`}>
        {displayValue}
      </p>
      
      <p className="text-sm text-muted-foreground mt-1">
        {title}
      </p>
    </motion.div>
  );
};
