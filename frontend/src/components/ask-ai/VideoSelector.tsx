import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Video, Loader2, AlertCircle, Check, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface VideoOption {
  id: string;
  analysis_id: string;
  title: string;
  thumbnail: string;
  commentCount: number;
}

interface VideoSelectorProps {
  selectedVideo?: VideoOption;
  selectedVideoId: string;
  videoOptions: VideoOption[];
  isOpen: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onSelect: (videoId: string) => void;
  variant?: 'full' | 'compact';
}

export const VideoSelector = ({
  selectedVideo,
  selectedVideoId,
  videoOptions,
  isOpen,
  isLoading,
  onToggle,
  onSelect,
  variant = 'full',
}: VideoSelectorProps) => {
  const navigate = useNavigate();
  
  // Calculate total comments across all videos
  const totalComments = videoOptions.reduce((sum, v) => sum + v.commentCount, 0);
  const isAllSelected = selectedVideoId === 'all';

  if (variant === 'compact') {
    return (
      <div className="relative flex-1 max-w-sm">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 hover:bg-secondary px-2 py-1 -mx-2 rounded-lg transition-colors w-full"
        >
          {isAllSelected ? (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
          ) : selectedVideo ? (
            <img
              src={selectedVideo.thumbnail}
              alt={selectedVideo.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : null}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs text-muted-foreground">Asking about:</p>
            <p className="text-sm font-medium truncate max-w-[200px]">
              {isAllSelected ? 'All Videos' : selectedVideo?.title || 'Select a video'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 w-80 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
            >
              <div className="max-h-80 overflow-y-auto p-2">
                {/* All Videos Option */}
                <button
                  onClick={() => onSelect('all')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors mb-1 ${
                    isAllSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="w-12 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium">All Videos</p>
                    <p className="text-xs text-muted-foreground">{totalComments.toLocaleString()} total comments</p>
                  </div>
                  {isAllSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
                
                <div className="border-t border-border my-1" />
                
                {videoOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelect(v.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors ${
                      selectedVideoId === v.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-12 h-8 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.commentCount.toLocaleString()} comments</p>
                    </div>
                    {selectedVideoId === v.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full variant for initial state
  return (
    <div className="relative w-full max-w-md mx-auto">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
      >
        {isAllSelected ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">All Videos ({videoOptions.length})</span>
          </div>
        ) : selectedVideo ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={selectedVideo.thumbnail}
              alt={selectedVideo.title}
              className="w-12 h-8 rounded object-cover flex-shrink-0"
            />
            <span className="text-sm font-medium truncate">{selectedVideo.title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Video className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Select a video to analyze</span>
          </div>
        )}
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Loading videos...</p>
              </div>
            ) : videoOptions.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">No analyzed videos yet</p>
                <button
                  onClick={() => navigate('/analyze')}
                  className="text-sm text-primary hover:underline"
                >
                  Analyze your first video →
                </button>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2">
                {/* All Videos Option */}
                <button
                  onClick={() => onSelect('all')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors mb-1 ${
                    isAllSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="w-16 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium">All Videos</p>
                    <p className="text-xs text-muted-foreground">{totalComments.toLocaleString()} total comments across {videoOptions.length} videos</p>
                  </div>
                  {isAllSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
                
                <div className="border-t border-border my-1" />
                
                {videoOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelect(v.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors ${
                      selectedVideoId === v.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-16 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.commentCount.toLocaleString()} comments</p>
                    </div>
                    {selectedVideoId === v.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
