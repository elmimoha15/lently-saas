import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SentimentChartProps {
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export const SentimentChart = ({ sentiment }: SentimentChartProps) => {
  const data = [
    { name: 'Positive', value: sentiment.positive, color: '#065F46', emoji: '😊' },
    { name: 'Neutral', value: sentiment.neutral, color: '#6B7280', emoji: '😐' },
    { name: 'Negative', value: sentiment.negative, color: '#DC2626', emoji: '😔' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md">
                      <p className="text-sm font-medium">
                        {item.emoji} {item.name}: {item.value}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">
              {item.emoji} {item.name}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
