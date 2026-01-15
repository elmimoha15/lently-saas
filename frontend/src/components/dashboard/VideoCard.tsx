import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Video } from '@/data/videos';

interface VideoCardProps {
  video: Video;
  index?: number;
}

export const VideoCard = ({ video, index = 0 }: VideoCardProps) => {
  const daysSinceAnalysis = Math.ceil(
    (new Date().getTime() - new Date(video.analyzedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/videos/${video.id}`} className="block">
        <div className="card-premium p-0 overflow-hidden">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            
            <p className="text-sm text-muted-foreground mt-2">
              {video.commentCount.toLocaleString()} comments • Analyzed {daysSinceAnalysis} days ago
            </p>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1">
                😊 <span className="text-success font-medium">{video.sentiment.positive}%</span> Positive
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                ❓ {video.categories.questions} Questions
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
