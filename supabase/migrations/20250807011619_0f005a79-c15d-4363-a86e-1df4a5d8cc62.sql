-- Add overview column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN overview text;

-- Add DELETE policy for contracts table
CREATE POLICY "Users can delete contracts from their conversations" 
ON public.contracts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM conversations 
  WHERE conversations.id = contracts.conversation_id 
  AND conversations.user_id = auth.uid()
));