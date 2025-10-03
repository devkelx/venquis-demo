-- Enable RLS on n8n_chat_histories table
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Allow service_role (used by n8n) to manage all n8n chat histories
CREATE POLICY "Service role can manage n8n chat histories" 
ON n8n_chat_histories 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);