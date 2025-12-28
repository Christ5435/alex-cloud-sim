import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { HardDrive } from 'lucide-react';

interface Profile {
  storage_quota: number;
  used_storage: number;
}

export function StorageUsage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('storage_quota, used_storage')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usedPercentage = profile 
    ? Math.min((profile.used_storage / profile.storage_quota) * 100, 100)
    : 0;

  const getProgressColor = () => {
    if (usedPercentage >= 90) return 'bg-destructive';
    if (usedPercentage >= 70) return 'bg-cloud-orange';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent>
          <div className="h-2 bg-muted rounded w-full mb-2" />
          <div className="h-3 bg-muted rounded w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          Storage Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress 
            value={usedPercentage} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(profile?.used_storage || 0)} used</span>
            <span>{formatBytes(profile?.storage_quota || 0)} total</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {(100 - usedPercentage).toFixed(1)}% available
          </p>
        </div>
      </CardContent>
    </Card>
  );
}