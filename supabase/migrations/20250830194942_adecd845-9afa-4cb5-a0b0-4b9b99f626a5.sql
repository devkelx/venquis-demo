-- CRITICAL SECURITY FIX: Add RLS policies for files table
-- Currently the files table has NO RLS protection, exposing all user file data

-- Enable RLS on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for files table
CREATE POLICY "Users can view their own files" 
ON public.files 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files" 
ON public.files 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files" 
ON public.files 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" 
ON public.files 
FOR DELETE 
USING (user_id = auth.uid());

-- STORAGE SECURITY FIX: Remove conflicting storage policy that allows viewing all files
DROP POLICY IF EXISTS "Users can view contract files" ON storage.objects;

-- Create secure storage policies that restrict access to user's own folder
CREATE POLICY "Users can view their own contract files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert their own contract files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own contract files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own contract files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'contracts' AND auth.uid()::text = (storage.foldername(name))[1]);