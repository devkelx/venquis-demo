-- Add missing columns to messages table to match n8n workflow
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS action_buttons JSONB,
ADD COLUMN IF NOT EXISTS agent_used TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);