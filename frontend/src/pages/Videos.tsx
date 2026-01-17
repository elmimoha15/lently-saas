import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Video as VideoIcon, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { VideoTable } from '@/components/dashboard/VideoTable';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { analysisApi } from '@/services/api.service';
import { useQuery } from '@tanstack/react-query';
import type { AnalysisHistoryItem } from '@/types/analysis';

// Convert API response to Video format for VideoTable
interface Video {
  id: string;
  title: string;
  channel: string;
  channelVerified: boolean;
  thumbnail: string;
  commentCount: number;
  publishedAt: string;
  analyzedAt: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categories: {
    questions: number;
    praise: number;
    complaints: number;
    suggestions: number;
    spam: number;
    general: number;
  };
  topics: string[];
  isProcessing?: boolean;
  progress?: number;
}

const filterOptions = ['All', 'This Week', 'This Month', 'Positive', 'Negative'];

const Videos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const { state: analysisState } = useAnalysis();

  // Fetch video history from API with periodic refetch for processing videos
  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['analysisHistory'],
    queryFn: async () => {
      const response = await analysisApi.getHistory(50);
      if (response.error) {
        throw new Error(response.error.detail);
      }
      return response.data;
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: (data) => {
      // If there are processing videos, poll every 2 seconds
      const hasProcessing = data?.analyses?.some((a: any) => a.status === 'processing');
      return hasProcessing ? 2000 : false;
    },
  });

  // Convert history to Video format
  const apiVideos: Video[] = useMemo(() => {
    if (!historyData?.analyses) return [];

    return historyData.analyses.map((item: AnalysisHistoryItem): Video => {
      // Check if this is a processing video
      const isProcessing = item.status === 'processing';
      
      return {
        id: item.video_id || item.analysis_id,
        title: item.video_title,
        channel: item.channel_title || 'Unknown Channel',
        channelVerified: false,
        thumbnail: item.video_thumbnail || 'https://via.placeholder.com/640x360?text=No+Thumbnail',
        commentCount: item.comments_analyzed || 0,
        publishedAt: item.created_at,
        analyzedAt: item.created_at,
        sentiment: {
          positive: item.sentiment_summary?.positive || 33,
          neutral: item.sentiment_summary?.neutral || 34,
          negative: item.sentiment_summary?.negative || 33,
        },
        categories: {
          questions: 0,
          praise: 0,
          complaints: 0,
          suggestions: 0,
          spam: 0,
          general: item.comments_analyzed || 0,
        },
        topics: [],
        isProcessing: isProcessing,
        progress: isProcessing ? item.progress || 0 : undefined,
      };
    });
  }, [historyData]);

  // Add active analyses to the list (only if not already in API results)
  const processingVideos: Video[] = useMemo(() => {
    const processing: Video[] = [];
    const apiAnalysisIds = new Set(apiVideos.map(v => v.id));
    
    analysisState.activeAnalyses.forEach((analysis) => {
      if (analysis.step !== 'completed' && analysis.step !== 'failed' && !apiAnalysisIds.has(analysis.analysisId)) {
        processing.push({
          id: analysis.analysisId,
          title: analysis.videoTitle || 'Processing...',
          channel: 'Loading...',
          channelVerified: false,
          thumbnail: analysis.videoThumbnail || 'https://via.placeholder.com/640x360?text=Processing',
          commentCount: analysis.totalComments || 0,
          publishedAt: analysis.startedAt.toISOString(),
          analyzedAt: analysis.startedAt.toISOString(),
          sentiment: { positive: 0, neutral: 100, negative: 0 },
          categories: { questions: 0, praise: 0, complaints: 0, suggestions: 0, spam: 0, general: 0 },
          topics: [],
          isProcessing: true,
          progress: analysis.progress,
        });
      }
    });
    return processing;
  }, [analysisState.activeAnalyses, apiVideos]);

  // Combine processing and completed videos
  const allVideos = useMemo(() => {
    return [...processingVideos, ...apiVideos];
  }, [processingVideos, apiVideos]);

  const filteredVideos = useMemo(() => {
    let result = [...allVideos];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.channel.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    switch (activeFilter) {
      case 'This Week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter((v) => new Date(v.analyzedAt) >= weekAgo);
        break;
      case 'This Month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        result = result.filter((v) => new Date(v.analyzedAt) >= monthAgo);
        break;
      case 'Positive':
        result = result.filter((v) => v.sentiment.positive >= 70);
        break;
      case 'Negative':
        result = result.filter((v) => v.sentiment.negative >= 20);
        break;
    }

    return result;
  }, [searchQuery, activeFilter, allVideos]);

  // Refetch when active analyses complete
  useEffect(() => {
    if (analysisState.completedAnalysisIds.length > 0) {
      refetch();
    }
  }, [analysisState.completedAnalysisIds, refetch]);

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Videos</h1>
            <p className="text-muted-foreground mt-1">
              {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-premium pl-10 w-full sm:w-64"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
              <Filter className="w-4 h-4 text-muted-foreground ml-2" />
              {filterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setActiveFilter(option)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all font-medium ${
                    activeFilter === option
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video Table */}
        {isLoading ? (
          <VideoTableSkeleton />
        ) : filteredVideos.length > 0 ? (
          <VideoTable videos={filteredVideos} />
        ) : (
          <EmptyState />
        )}

        {/* Pagination */}
        {filteredVideos.length > 0 && (
          <div className="flex justify-center gap-2 pt-4">
            <button className="px-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              Previous
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={`w-10 h-10 text-sm rounded-lg transition-all font-medium ${
                  page === 1
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                }`}
              >
                {page}
              </button>
            ))}
            <span className="w-10 h-10 flex items-center justify-center text-muted-foreground">
              ...
            </span>
            <button className="w-10 h-10 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-all font-medium">
              10
            </button>
            <button className="px-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              Next
            </button>
          </div>
        )}
      </motion.div>
    </MainLayout>
  );
};

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-card"
  >
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      <VideoIcon className="w-10 h-10 text-primary" />
    </div>
    <h3 className="text-xl font-semibold mb-2">No videos analyzed yet</h3>
    <p className="text-muted-foreground mb-6">
      Analyze your first video to get started
    </p>
    <Link to="/analyze">
      <Button className="btn-primary flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        Analyze Video
      </Button>
    </Link>
  </motion.div>
);

const VideoTableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl animate-pulse">
        <div className="w-40 h-24 bg-muted rounded-lg"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-muted rounded-full"></div>
            <div className="h-6 w-16 bg-muted rounded-full"></div>
            <div className="h-6 w-16 bg-muted rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default Videos;
