-- Create file shares table for shareable links
CREATE TABLE public.file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'download')),
  expires_at TIMESTAMP WITH TIME ZONE,
  password_hash TEXT,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- Owners can manage their shares
CREATE POLICY "Users can create shares for own files"
ON public.file_shares
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view own shares"
ON public.file_shares
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can update own shares"
ON public.file_shares
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own shares"
ON public.file_shares
FOR DELETE
USING (owner_id = auth.uid());

-- Public access to active shares by token (for unauthenticated access)
CREATE POLICY "Anyone can view active shares by token"
ON public.file_shares
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Admins can view all shares
CREATE POLICY "Admins can view all shares"
ON public.file_shares
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_file_shares_updated_at
BEFORE UPDATE ON public.file_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();