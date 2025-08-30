-- Fix critical security vulnerability in profiles table
-- Remove the dangerous public policy that exposes all user emails
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Add secure RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Add comprehensive RLS policies for files table to prevent unauthorized access
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

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