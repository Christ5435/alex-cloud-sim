import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileIcon, HardDrive, Activity, Cloud } from 'lucide-react';

interface Stats {
  totalFiles: number;
  totalSize: number;
  activeNodes: number;
  recentActivity: number;
}

export function StatsCards() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalFiles: 0,
    totalSize: 0,
    activeNodes: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      // Fetch files count and total size
      const { data: files } = await supabase
        .from('files')
        .select('size')
        .eq('owner_id', user.id)
        .eq('is_deleted', false);

      // Fetch active nodes
      const { data: nodes } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('status', 'online');

      // Fetch recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data: activity } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString());

      setStats({
        totalFiles: files?.length || 0,
        totalSize: files?.reduce((acc, f) => acc + f.size, 0) || 0,
        activeNodes: nodes?.length || 0,
        recentActivity: activity?.length || 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, [user]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const cards = [
    {
      title: 'Total Files',
      value: stats.totalFiles.toString(),
      icon: FileIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Storage Used',
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
      color: 'text-cloud-purple',
      bgColor: 'bg-cloud-purple/10',
    },
    {
      title: 'Active Nodes',
      value: stats.activeNodes.toString(),
      icon: Cloud,
      color: 'text-cloud-green',
      bgColor: 'bg-cloud-green/10',
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity.toString(),
      subtext: 'last 24h',
      icon: Activity,
      color: 'text-cloud-orange',
      bgColor: 'bg-cloud-orange/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-8 w-8 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subtext && (
              <p className="text-xs text-muted-foreground">{card.subtext}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}