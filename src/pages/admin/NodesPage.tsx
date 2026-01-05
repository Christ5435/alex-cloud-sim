import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Server, Plus, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function NodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNodeOpen, setNewNodeOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeLocation, setNodeLocation] = useState('');
  const [nodeCapacity, setNodeCapacity] = useState('10');

  // Fetch all nodes
  const { data: nodes, isLoading } = useQuery({
    queryKey: ['admin-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add new node mutation
  const addNode = useMutation({
    mutationFn: async () => {
      const capacityBytes = parseFloat(nodeCapacity) * 1024 * 1024 * 1024;
      const { error } = await supabase
        .from('storage_nodes')
        .insert({
          node_name: nodeName,
          location: nodeLocation || null,
          capacity: capacityBytes,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      setNewNodeOpen(false);
      setNodeName('');
      setNodeLocation('');
      setNodeCapacity('10');
      toast({
        title: 'Node created',
        description: 'New storage node has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update node status mutation
  const updateNodeStatus = useMutation({
    mutationFn: async ({ nodeId, status }: { nodeId: string; status: string }) => {
      const { error } = await supabase
        .from('storage_nodes')
        .update({ status })
        .eq('id', nodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Status updated',
        description: 'Node status has been updated.',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'offline':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'maintenance':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              Storage Nodes
            </h1>
            <p className="text-muted-foreground">Manage and monitor storage infrastructure</p>
          </div>
          <Dialog open={newNodeOpen} onOpenChange={setNewNodeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Storage Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nodeName">Node Name</Label>
                  <Input
                    id="nodeName"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder="e.g., Node-US-East-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nodeLocation">Location (optional)</Label>
                  <Input
                    id="nodeLocation"
                    value={nodeLocation}
                    onChange={(e) => setNodeLocation(e.target.value)}
                    placeholder="e.g., US East"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nodeCapacity">Capacity (GB)</Label>
                  <Input
                    id="nodeCapacity"
                    type="number"
                    value={nodeCapacity}
                    onChange={(e) => setNodeCapacity(e.target.value)}
                    placeholder="10"
                    min="1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewNodeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addNode.mutate()}
                  disabled={!nodeName || addNode.isPending}
                >
                  {addNode.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Node'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Nodes Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>All Storage Nodes</CardTitle>
            <CardDescription>Configure and monitor storage nodes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Node Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes?.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-medium">{node.node_name}</TableCell>
                      <TableCell>{node.location || 'Not specified'}</TableCell>
                      <TableCell>
                        {formatBytes(node.used_space)} / {formatBytes(node.capacity)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(node.status)}>
                          {node.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={node.status}
                          onValueChange={(status) =>
                            updateNodeStatus.mutate({ nodeId: node.id, status })
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
