import { Users, Sparkles } from "lucide-react";
import { useBadgeStats } from "@/hooks/useBadgeStats";

interface BadgeStatsDisplayProps {
  badgeId: string;
}

export const BadgeStatsDisplay = ({ badgeId }: BadgeStatsDisplayProps) => {
  const { stats, loading } = useBadgeStats(badgeId);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
        <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  const formatRank = (rank: number | null) => {
    if (!rank) return '';
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
    return `#${rank}${suffix}`;
  };

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      {stats.ownersCount > 0 && (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="font-mono">
            {stats.ownersCount} owner{stats.ownersCount !== 1 ? 's' : ''}
            {stats.ownershipRank && (
              <span className="text-primary ml-1">
                ({formatRank(stats.ownershipRank)})
              </span>
            )}
          </span>
        </div>
      )}
      {stats.wantsCount > 0 && (
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          <span className="font-mono">
            {stats.wantsCount} want{stats.wantsCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};