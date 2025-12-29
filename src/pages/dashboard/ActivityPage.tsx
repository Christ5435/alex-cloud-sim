import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Upload, Trash2, Download, LogIn, UserPlus, Settings, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, typeof Activity> = {
  upload: Upload,
  delete: Trash2,
  download: Download,
  login: LogIn,
  signup: UserPlus,
  settings_update: Settings,
  file_access: FileText,
};

const actionColors: Record<string, string> = {
  upload: 'bg-green-500/10 text-green-500 border-green-500/20',
  delete: 'bg-red-500/10 text-red-500 border-red-500/20',
  download: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  login: 'bg-primary/10 text-primary border-primary/20',
  signup: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  settings_update: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  file_access: 'bg-muted text-muted-foreground border-border',
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-logs', user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getIcon = (action: string) => {
    const Icon = actionIcons[action] || Activity;
    return Icon;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">Track your recent actions and events</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="download">Downloads</SelectItem>
              <SelectItem value="delete">Deletions</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getIcon(activity.action);
                    const colorClass = actionColors[activity.action] || actionColors.file_access;
                    const details = activity.details as Record<string, unknown> | null;
                    
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize">{activity.action.replace('_', ' ')}</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.resource_type}
                            </Badge>
                          </div>
                          {details && (
                            <p className="text-sm text-muted-foreground truncate">
                              {details.filename as string || details.description as string || 'No details available'}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {format(new Date(activity.created_at), 'MMM d, yyyy')}
                          <br />
                          {format(new Date(activity.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-1">No activity yet</h3>
                <p className="text-muted-foreground">Your actions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
