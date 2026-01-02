import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, FileIcon, X } from 'lucide-react';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    original_filename: string;
    mime_type: string | null;
    storage_path: string;
    size: number;
  } | null;
  signedUrl?: string;
  onDownload?: () => void;
  canDownload?: boolean;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  signedUrl: externalSignedUrl,
  onDownload,
  canDownload = true,
}: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isImage = file?.mime_type?.startsWith('image/');
  const isPdf = file?.mime_type === 'application/pdf';
  const isText = file?.mime_type?.startsWith('text/') || 
    file?.mime_type === 'application/json' ||
    file?.mime_type === 'application/xml';
  const isVideo = file?.mime_type?.startsWith('video/');
  const isAudio = file?.mime_type?.startsWith('audio/');
  const isPreviewable = isImage || isPdf || isText || isVideo || isAudio;

  useEffect(() => {
    if (!open || !file) {
      setSignedUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    if (externalSignedUrl) {
      setSignedUrl(externalSignedUrl);
      if (isText) {
        fetchTextContent(externalSignedUrl);
      } else {
        setLoading(false);
      }
      return;
    }

    fetchSignedUrl();
  }, [open, file, externalSignedUrl]);

  const fetchSignedUrl = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: urlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(file.storage_path, 3600);

      if (urlError) throw urlError;

      setSignedUrl(data.signedUrl);

      if (isText) {
        await fetchTextContent(data.signedUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const fetchTextContent = async (url: string) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      setTextContent(text.slice(0, 50000));
      setLoading(false);
    } catch {
      setError('Failed to load text content');
      setLoading(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate pr-4">{file.original_filename}</DialogTitle>
          <div className="flex items-center gap-2">
            {canDownload && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[300px] flex items-center justify-center bg-muted/30">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : error ? (
            <div className="text-center p-8">
              <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : !isPreviewable ? (
            <div className="text-center p-8">
              <FileIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Preview not available</p>
              <p className="text-sm text-muted-foreground mb-4">
                This file type cannot be previewed. {canDownload && 'Download to view.'}
              </p>
              {canDownload && onDownload && (
                <Button onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              )}
            </div>
          ) : isImage && signedUrl ? (
            <img
              src={signedUrl}
              alt={file.original_filename}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : isPdf && signedUrl ? (
            <iframe
              src={signedUrl}
              className="w-full h-[70vh]"
              title={file.original_filename}
            />
          ) : isVideo && signedUrl ? (
            <video
              src={signedUrl}
              controls
              className="max-w-full max-h-[70vh]"
            />
          ) : isAudio && signedUrl ? (
            <div className="p-8 text-center">
              <FileIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-4">{file.original_filename}</p>
              <audio src={signedUrl} controls className="w-full max-w-md" />
            </div>
          ) : isText && textContent !== null ? (
            <ScrollArea className="w-full h-[70vh]">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                {textContent}
              </pre>
            </ScrollArea>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
