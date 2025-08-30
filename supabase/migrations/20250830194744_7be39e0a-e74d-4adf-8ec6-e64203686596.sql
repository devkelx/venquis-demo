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