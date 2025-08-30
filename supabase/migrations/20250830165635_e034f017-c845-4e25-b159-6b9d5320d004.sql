-- Enable Row Level Security on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for files table to ensure users can only access their own files
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