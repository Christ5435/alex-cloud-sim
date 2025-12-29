import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Server, MapPin, Activity, Clock, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function NodesPage() {
  const { data: nodes, isLoading } = useQuery({
    queryKey: ['storage-nodes-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('*')
        .order('node_name');
      if (error) throw error;
      return data;
    },
  });

  const totalCapacity = nodes?.reduce((sum, node) => sum + node.capacity, 0) || 0;
  const totalUsed = nodes?.reduce((sum, node) => sum + node.used_space, 0) || 0;
  const onlineNodes = nodes?.filter(n => n.status === 'online').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Storage Nodes</h1>
          <p className="text-muted-foreground">Monitor and manage distributed storage nodes</p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Nodes</p>
                  <p className="text-2xl font-bold">{nodes?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold">{onlineNodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Capacity</p>
                  <p className="text-2xl font-bold">{formatBytes(totalCapacity)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <HardDrive className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Used Storage</p>
                  <p className="text-2xl font-bold">{formatBytes(totalUsed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nodes Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur animate-pulse">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-2 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))
          ) : nodes?.map((node) => {
            const usagePercent = (node.used_space / node.capacity) * 100;
            const statusColor = node.status === 'online' 
              ? 'bg-green-500' 
              : node.status === 'maintenance' 
              ? 'bg-yellow-500' 
              : 'bg-red-500';
            
            return (
              <Card key={node.id} className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Server className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{node.node_name}</CardTitle>
                        {node.location && (
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {node.location}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                      <span className="capitalize">{node.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Storage Usage</span>
                      <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatBytes(node.used_space)} used</span>
                      <span>{formatBytes(node.capacity)} total</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <Clock className="h-3 w-3" />
                    <span>Updated {formatDistanceToNow(new Date(node.updated_at), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
