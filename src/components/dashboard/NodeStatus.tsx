import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HardDrive, CheckCircle, XCircle, Wrench } from 'lucide-react';

interface StorageNode {
  id: string;
  node_name: string;
  capacity: number;
  used_space: number;
  status: string;
  location: string | null;
}

interface NodeStatusProps {
  compact?: boolean;
}

export function NodeStatus({ compact = false }: NodeStatusProps) {
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNodes() {
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('*')
        .order('node_name');

      if (!error && data) {
        setNodes(data);
      }
      setLoading(false);
    }

    fetchNodes();
  }, []);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-cloud-green" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-cloud-orange" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-cloud-green/10 text-cloud-green border-cloud-green/20">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'maintenance':
        return <Badge className="bg-cloud-orange/10 text-cloud-orange border-cloud-orange/20">Maintenance</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Storage Nodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {nodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(node.status)}
                  <span className="text-sm font-medium">{node.node_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(node.used_space)} / {formatBytes(node.capacity)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {nodes.map((node) => {
        const usedPercentage = (node.used_space / node.capacity) * 100;
        return (
          <Card key={node.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  {node.node_name}
                </CardTitle>
                {getStatusBadge(node.status)}
              </div>
              {node.location && (
                <p className="text-xs text-muted-foreground">{node.location}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{formatBytes(node.capacity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">{formatBytes(node.used_space)}</span>
                </div>
                <Progress value={usedPercentage} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {usedPercentage.toFixed(1)}% used
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}