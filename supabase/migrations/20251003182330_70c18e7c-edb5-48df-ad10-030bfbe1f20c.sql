-- Add last_activity column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'conversations' AND column_name = 'last_activity') THEN
    ALTER TABLE conversations ADD COLUMN last_activity timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'conversations' AND column_name = 'metadata') THEN
    ALTER TABLE conversations ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add session_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'conversations' AND column_name = 'session_id') THEN
    ALTER TABLE conversations ADD COLUMN session_id text DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- Copy data from zep_session_id to session_id if zep_session_id exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'conversations' AND column_name = 'zep_session_id') THEN
    UPDATE conversations SET session_id = zep_session_id WHERE session_id IS NULL OR session_id = '';
    -- Drop old column
    ALTER TABLE conversations DROP COLUMN zep_session_id;
  END IF;
END $$;

-- Make session_id not nullable
ALTER TABLE conversations ALTER COLUMN session_id SET NOT NULL;