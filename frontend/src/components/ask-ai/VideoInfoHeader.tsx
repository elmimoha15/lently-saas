import { LayoutGrid } from 'lucide-react';

export interface VideoOption {
  id: string;
  analysis_id: string;
  title: string;
  thumbnail: string;
  commentCount: number;
}

interface VideoInfoHeaderProps {
  selectedVideo?: VideoOption;
  selectedVideoId: string;
  videoOptions: VideoOption[];
}

export const VideoInfoHeader = ({
  selectedVideo,
  selectedVideoId,
  videoOptions,
}: VideoInfoHeaderProps) => {
  // Calculate total comments across all videos
  const totalComments = videoOptions.reduce((sum, v) => sum + v.commentCount, 0);
  const isAllSelected = selectedVideoId === 'all';

  return (
    <div className="flex items-center justify-center px-4 py-4 bg-card border-b border-border">
      <div className="flex items-center gap-3 max-w-3xl w-full">
        {isAllSelected ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">All Videos</h3>
              <p className="text-sm text-muted-foreground">
                {totalComments.toLocaleString()} quality comments analyzed across {videoOptions.length} videos
              </p>
            </div>
          </>
        ) : selectedVideo ? (
          <>
            <img
              src={selectedVideo.thumbnail}
              alt={selectedVideo.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">{selectedVideo.title}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedVideo.commentCount.toLocaleString()} quality comments analyzed
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">No video selected</h3>
            <p className="text-sm text-muted-foreground">Select a video to start asking questions</p>
          </div>
        )}
      </div>
    </div>
  );
};
