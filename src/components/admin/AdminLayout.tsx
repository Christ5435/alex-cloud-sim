import { ReactNode, useEffect } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Users, Server, ArrowLeft, LogOut, FileText, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: 'Users', url: '/admin', icon: Users },
  { title: 'Storage Nodes', url: '/admin/nodes', icon: Server },
  { title: 'Activity Logs', url: '/admin/activity', icon: FileText },
  { title: 'Security Logs', url: '/admin/security', icon: ShieldAlert },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

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

  // Log admin access attempts
  const logAdminAccess = useMutation({
    mutationFn: async (success: boolean) => {
      if (!user) return;
      await supabase.from('security_audit_logs').insert({
        user_id: user.id,
        event_type: success ? 'admin_access' : 'admin_access_denied',
        event_description: success 
          ? 'Admin panel accessed successfully' 
          : 'Unauthorized admin panel access attempt',
        success,
        metadata: { path: location.pathname },
      });
    },
  });

  // Check OTP verification
  const otpVerified = typeof window !== 'undefined' 
    ? sessionStorage.getItem('otp_verified') === 'true' 
    : false;

  useEffect(() => {
    if (!loading && !roleLoading && user && userRole === 'admin' && otpVerified) {
      logAdminAccess.mutate(true);
    } else if (!loading && !roleLoading && user && userRole !== 'admin') {
      logAdminAccess.mutate(false);
    }
  }, [loading, roleLoading, user, userRole, otpVerified]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if OTP was verified
  if (!otpVerified) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">403 Forbidden – Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access the admin panel.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Admin Mode Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center py-1 text-xs font-semibold">
        🔐 ADMIN MODE — All actions are logged
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col mt-6">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg">Admin Panel</h1>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">ADMIN</Badge>
              </div>
              <p className="text-xs text-muted-foreground">System Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                location.pathname === item.url
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto mt-6">
        {children}
      </main>
    </div>
  );
}
