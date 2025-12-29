import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileIcon,
  FileImage,
  FileText,
  FileArchive,
  MoreVertical,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  Loader2,
} from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  mime_type: string | null;
  uploaded_at: string;
  storage_path: string;
}

interface FileGridProps {
  refreshTrigger?: number;
  searchQuery?: string;
  sortBy?: string;
  viewMode?: 'grid' | 'list';
  compact?: boolean;
}

export function FileGrid({ 
  refreshTrigger, 
  searchQuery: externalSearchQuery, 
  sortBy = 'newest',
  viewMode: externalViewMode,
  compact = false
}: FileGridProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const viewMode = externalViewMode ?? internalViewMode;
  const showControls = externalSearchQuery === undefined && externalViewMode === undefined;
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [user, refreshTrigger]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return FileIcon;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return FileArchive;
    return FileIcon;
  };

  const handleDownload = async (file: FileItem) => {
    const { data, error } = await supabase.storage
      .from('user-files')
      .download(file.storage_path);

    if (error) {
      toast({
        title: 'Download Failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user?.id,
      action: 'download',
      resource_type: 'file',
      resource_id: file.id,
      details: { filename: file.original_filename },
    });
  };

  const handleDelete = async () => {
    if (!deleteFile || !user) return;

    setDeleting(true);
    try {
      // Delete from storage
      await supabase.storage.from('user-files').remove([deleteFile.storage_path]);

      // Mark as deleted in database
      await supabase
        .from('files')
        .update({ is_deleted: true })
        .eq('id', deleteFile.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'delete',
        resource_type: 'file',
        resource_id: deleteFile.id,
        details: { filename: deleteFile.original_filename },
      });

      toast({
        title: 'File Deleted',
        description: `${deleteFile.original_filename} has been deleted.`,
      });

      setFiles(prev => prev.filter(f => f.id !== deleteFile.id));
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteFile(null);
    }
  };

  const filteredFiles = files
    .filter(file => file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case 'name':
          return a.original_filename.localeCompare(b.original_filename);
        case 'size':
          return b.size - a.size;
        case 'newest':
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showControls && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={internalSearchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={internalViewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setInternalViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={internalViewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setInternalViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No files yet</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'No files match your search.' : 'Upload your first file to get started.'}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file.mime_type);
            return (
              <Card
                key={file.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm truncate w-full" title={file.original_filename}>
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(file.size)}
                  </p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteFile(file)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file.mime_type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.original_filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(file.size)} • {formatDate(file.uploaded_at)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteFile(file)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteFile?.original_filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}