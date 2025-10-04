-- Fix security: Set search_path on the trigger function
ALTER FUNCTION public.populate_conversation_id_from_metadata() 
SET search_path = public;