-- Add foreign key constraints with CASCADE delete for conversations

-- Add foreign key for messages table
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;

-- Add foreign key for contracts table
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_conversation_id_fkey;

ALTER TABLE contracts
ADD CONSTRAINT contracts_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;

-- Add foreign key for contract_chunks table
ALTER TABLE contract_chunks
DROP CONSTRAINT IF EXISTS contract_chunks_conversation_id_fkey;

ALTER TABLE contract_chunks
ADD CONSTRAINT contract_chunks_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;

-- Add foreign key for contract_metadata table
ALTER TABLE contract_metadata
DROP CONSTRAINT IF EXISTS contract_metadata_conversation_id_fkey;

ALTER TABLE contract_metadata
ADD CONSTRAINT contract_metadata_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;

-- Add DELETE policy for messages table so users can delete their messages
DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON messages;

CREATE POLICY "Users can delete messages from their conversations"
ON messages
FOR DELETE
USING (conversation_id IN (
  SELECT id FROM conversations WHERE user_id = auth.uid()
));

-- Add DELETE policy for contract_metadata table
DROP POLICY IF EXISTS "Users can delete their own contract metadata" ON contract_metadata;

CREATE POLICY "Users can delete their own contract metadata"
ON contract_metadata
FOR DELETE
USING (auth.uid() = user_id);