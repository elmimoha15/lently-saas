/**
 * Video Header Section
 * Displays video thumbnail, title, stats, and sentiment overview
 */

import { motion } from 'framer-motion';
import { Eye, MessageSquare, ThumbsUp, Calendar } from 'lucide-react';
import { SentimentChart } from './SentimentChart';

interface Video {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

interface VideoHeaderProps {
  video: Video;
  sentimentData: SentimentData;
  commentsAnalyzed: number;
}

export const VideoHeader = ({ video, sentimentData, commentsAnalyzed }: VideoHeaderProps) => {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-[400px] flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-video rounded-xl overflow-hidden shadow-lg"
        >
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>

      <div className="flex-1 space-y-6">
        {/* Title and Channel */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{video.title}</h1>
          <p className="text-muted-foreground">{video.channel_title}</p>
        </div>

        {/* Video Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{video.view_count.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">views</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThumbsUp className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{video.like_count.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">likes</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{video.comment_count.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">comments</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {new Date(video.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs text-muted-foreground">published</div>
            </div>
          </div>
        </div>

        {/* Sentiment Overview */}
        <div className="card-premium">
          <h3 className="text-lg font-semibold mb-4">Sentiment Overview</h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <SentimentChart sentiment={sentimentData} />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{commentsAnalyzed.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">comments analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
