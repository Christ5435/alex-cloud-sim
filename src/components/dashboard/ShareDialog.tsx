import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Link, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    filename: string;
    original_filename: string;
  } | null;
}

interface ShareLink {
  id: string;
  share_token: string;
  permission: string;
  expires_at: string | null;
  is_active: boolean;
  download_count: number;
  max_downloads: number | null;
  created_at: string;
}

export function ShareDialog({ open, onOpenChange, file }: ShareDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState('7');
  const [hasMaxDownloads, setHasMaxDownloads] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState('10');

  const fetchShares = async () => {
    if (!file) return;
    
    const { data, error } = await supabase
      .from('file_shares')
      .select('*')
      .eq('file_id', file.id)
      .eq('owner_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShares(data as ShareLink[]);
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && file) {
      await fetchShares();
    }
    onOpenChange(isOpen);
  };

  const createShare = async () => {
    if (!file || !user) return;
    
    setLoading(true);
    try {
      const expiresAt = hasExpiry 
        ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('file_shares')
        .insert({
          file_id: file.id,
          owner_id: user.id,
          permission,
          expires_at: expiresAt,
          max_downloads: hasMaxDownloads ? parseInt(maxDownloads) : null,
        });

      if (error) throw error;

      toast.success('Share link created');
      await fetchShares();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const deleteShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('file_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Share link deleted');
      setShares(shares.filter(s => s.id !== shareId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete share link');
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    if (date < new Date()) return 'Expired';
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create shareable links for "{file?.original_filename}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new share */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as 'view' | 'download')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="download">Allow download</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="expiry">Set expiry</Label>
              <Switch id="expiry" checked={hasExpiry} onCheckedChange={setHasExpiry} />
            </div>
            {hasExpiry && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="max-downloads">Limit downloads</Label>
              <Switch id="max-downloads" checked={hasMaxDownloads} onCheckedChange={setHasMaxDownloads} />
            </div>
            {hasMaxDownloads && (
              <Input
                type="number"
                min="1"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder="Max downloads"
              />
            )}

            <Button onClick={createShare} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
              Create Share Link
            </Button>
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label>Active Links</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{share.permission}</span>
                        {!share.is_active && <span className="text-destructive">(Disabled)</span>}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Expires: {formatExpiry(share.expires_at)}
                        {share.max_downloads && ` • ${share.download_count}/${share.max_downloads} downloads`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => copyLink(share.share_token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteShare(share.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
