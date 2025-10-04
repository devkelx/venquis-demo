-- Create trigger function to auto-populate conversation_id and contract_id from metadata
CREATE OR REPLACE FUNCTION public.populate_conversation_id_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract conversation_id from metadata if the column is NULL
  IF NEW.conversation_id IS NULL AND NEW.metadata ? 'conversation_id' THEN
    NEW.conversation_id := (NEW.metadata->>'conversation_id')::uuid;
  END IF;
  
  -- Extract contract_id from metadata if the column is NULL
  IF NEW.contract_id IS NULL AND NEW.metadata ? 'contract_id' THEN
    NEW.contract_id := (NEW.metadata->>'contract_id')::uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on contract_chunks table
CREATE TRIGGER auto_populate_conversation_id
  BEFORE INSERT ON public.contract_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_conversation_id_from_metadata();