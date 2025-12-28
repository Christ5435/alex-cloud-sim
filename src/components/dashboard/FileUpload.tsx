import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X, FileIcon, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const selectStorageNode = async () => {
    const { data: nodes } = await supabase
      .from('storage_nodes')
      .select('*')
      .eq('status', 'online')
      .order('used_space', { ascending: true })
      .limit(1);

    return nodes?.[0] || null;
  };

  const uploadFile = async (file: File, index: number) => {
    if (!user) return;

    try {
      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, status: 'uploading' as const, progress: 10 } : f)
      );

      const node = await selectStorageNode();
      if (!node) {
        throw new Error('No available storage nodes');
      }

      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, progress: 30 } : f)
      );

      const checksum = await generateChecksum(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${user.id}/${fileName}`;

      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, progress: 50 } : f)
      );

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, progress: 80 } : f)
      );

      const { error: dbError } = await supabase.from('files').insert({
        filename: fileName,
        original_filename: file.name,
        size: file.size,
        mime_type: file.type,
        checksum,
        owner_id: user.id,
        primary_node_id: node.id,
        storage_path: storagePath,
      });

      if (dbError) throw dbError;

      // Create replicas on other nodes
      const { data: otherNodes } = await supabase
        .from('storage_nodes')
        .select('id')
        .eq('status', 'online')
        .neq('id', node.id)
        .limit(2);

      if (otherNodes && otherNodes.length > 0) {
        const { data: newFile } = await supabase
          .from('files')
          .select('id')
          .eq('storage_path', storagePath)
          .single();

        if (newFile) {
          await supabase.from('file_replicas').insert(
            otherNodes.map(n => ({
              file_id: newFile.id,
              node_id: n.id,
              replica_path: `replica_${storagePath}`,
              status: 'synced',
            }))
          );
        }
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'upload',
        resource_type: 'file',
        details: { filename: file.name, size: file.size },
      });

      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, status: 'complete' as const, progress: 100 } : f)
      );

    } catch (error: any) {
      setUploadingFiles(prev => 
        prev.map((f, i) => i === index ? { ...f, status: 'error' as const, error: error.message } : f)
      );
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    const startIndex = uploadingFiles.length;
    for (let i = 0; i < acceptedFiles.length; i++) {
      await uploadFile(acceptedFiles[i], startIndex + i);
    }

    const hasErrors = uploadingFiles.some(f => f.status === 'error');
    if (!hasErrors) {
      toast({
        title: 'Upload Complete',
        description: `${acceptedFiles.length} file(s) uploaded successfully.`,
      });
      onUploadComplete?.();
    }
  }, [uploadingFiles.length, user, toast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Files
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-foreground font-medium">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Maximum file size: 100MB</p>
            </>
          )}
        </div>

        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
            {uploadingFiles.map((uploadFile, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-1 flex-1" />
                    )}
                    {uploadFile.status === 'complete' && (
                      <span className="text-xs text-cloud-green flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </span>
                    )}
                    {uploadFile.status === 'error' && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {uploadFile.error || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {uploadingFiles.some(f => f.status !== 'uploading') && (
              <Button variant="outline" size="sm" onClick={clearCompleted} className="w-full">
                Clear Completed
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}