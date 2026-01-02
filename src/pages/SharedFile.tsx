import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, FileIcon, Loader2, AlertTriangle, FileImage, FileText, FileVideo, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import { FilePreviewDialog } from '@/components/dashboard/FilePreviewDialog';

interface SharedFileData {
  id: string;
  share_token: string;
  permission: string;
  expires_at: string | null;
  is_active: boolean;
  download_count: number;
  max_downloads: number | null;
  file: {
    id: string;
    original_filename: string;
    filename: string;
    size: number;
    mime_type: string | null;
    storage_path: string;
  };
}

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [shareData, setShareData] = useState<SharedFileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchShareData();
  }, [token]);

  const fetchShareData = async () => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('file_shares')
        .select(`
          id,
          share_token,
          permission,
          expires_at,
          is_active,
          download_count,
          max_downloads,
          file:files!inner (
            id,
            original_filename,
            filename,
            size,
            mime_type,
            storage_path
          )
        `)
        .eq('share_token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Share link not found or has expired');
        setLoading(false);
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Check if active
      if (!data.is_active) {
        setError('This share link has been disabled');
        setLoading(false);
        return;
      }

      // Check download limit
      if (data.max_downloads && data.download_count >= data.max_downloads) {
        setError('Download limit reached for this share link');
        setLoading(false);
        return;
      }

      // Transform the data to match our interface
      const transformedData: SharedFileData = {
        ...data,
        file: Array.isArray(data.file) ? data.file[0] : data.file
      };

      setShareData(transformedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!shareData || shareData.permission !== 'download') return;

    setDownloading(true);
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(shareData.file.storage_path, 60);

      if (urlError) throw urlError;

      // Increment download count
      await supabase
        .from('file_shares')
        .update({ download_count: shareData.download_count + 1 })
        .eq('id', shareData.id);

      // Download
      const response = await fetch(urlData.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareData.file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Download started');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!shareData) return;
    
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(shareData.file.storage_path, 3600);

      if (urlError) throw urlError;
      
      setPreviewUrl(urlData.signedUrl);
      setShowPreview(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview');
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return FileIcon;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType === 'application/pdf') return FileText;
    return FileIcon;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Unable to Access File</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!shareData) return null;

  const IconComponent = getFileIcon(shareData.file.mime_type);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="break-all">{shareData.file.original_filename}</CardTitle>
          <CardDescription>
            {formatSize(shareData.file.size)}
            {shareData.file.mime_type && ` • ${shareData.file.mime_type.split('/')[1]?.toUpperCase()}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {shareData.permission === 'view' ? (
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>View only - download disabled</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                <span>Download allowed</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" className="flex-1" size="lg">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            {shareData.permission === 'download' && (
              <Button onClick={handleDownload} disabled={downloading} className="flex-1" size="lg">
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            )}
          </div>

          {shareData.expires_at && (
            <p className="text-center text-xs text-muted-foreground">
              Link expires: {new Date(shareData.expires_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <FilePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        file={shareData.file}
        signedUrl={previewUrl || undefined}
        onDownload={shareData.permission === 'download' ? handleDownload : undefined}
        canDownload={shareData.permission === 'download'}
      />
    </div>
  );
}
