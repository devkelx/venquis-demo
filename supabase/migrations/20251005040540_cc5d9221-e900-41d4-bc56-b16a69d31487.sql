-- Add title column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN title TEXT DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX idx_conversations_title ON public.conversations(title);

-- Add comment
COMMENT ON COLUMN public.conversations.title IS 'Auto-generated title from first message in conversation';