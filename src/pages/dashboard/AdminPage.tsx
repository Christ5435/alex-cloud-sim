import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Server, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNodeOpen, setNewNodeOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeLocation, setNodeLocation] = useState('');
  const [nodeCapacity, setNodeCapacity] = useState('10');

  // Check if current user is admin
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role;
    },
    enabled: !!user,
  });

  const isAdmin = userRole === 'admin';

  // Fetch all nodes for admin
  const { data: nodes } = useQuery({
    queryKey: ['admin-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Add new node mutation
  const addNode = useMutation({
    mutationFn: async () => {
      const capacityBytes = parseFloat(nodeCapacity) * 1024 * 1024 * 1024; // Convert GB to bytes
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

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access the admin panel. Contact an administrator if you believe this is an error.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">System management and monitoring</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
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
                  <Server className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Nodes</p>
                  <p className="text-2xl font-bold">{nodes?.filter(n => n.status === 'online').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Capacity</p>
                  <p className="text-2xl font-bold">
                    {formatBytes(nodes?.reduce((sum, n) => sum + n.capacity, 0) || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Nodes Management */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Storage Nodes</CardTitle>
              <CardDescription>Manage storage node configuration</CardDescription>
            </div>
            <Dialog open={newNodeOpen} onOpenChange={setNewNodeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
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
                      placeholder="e.g., Node-US-East-1"
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes?.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell className="font-medium">{node.node_name}</TableCell>
                    <TableCell>{node.location || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          node.status === 'online' 
                            ? 'border-green-500/50 text-green-500' 
                            : node.status === 'maintenance'
                            ? 'border-yellow-500/50 text-yellow-500'
                            : 'border-red-500/50 text-red-500'
                        }
                      >
                        {node.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBytes(node.capacity)}</TableCell>
                    <TableCell>{formatBytes(node.used_space)}</TableCell>
                    <TableCell>{formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <Select
                        value={node.status}
                        onValueChange={(status) => updateNodeStatus.mutate({ nodeId: node.id, status })}
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
