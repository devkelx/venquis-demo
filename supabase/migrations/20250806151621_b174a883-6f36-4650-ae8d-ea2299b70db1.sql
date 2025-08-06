-- Create storage policies for contracts bucket
CREATE POLICY "Users can upload contracts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'contracts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own contracts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'contracts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own contracts" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'contracts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own contracts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'contracts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);