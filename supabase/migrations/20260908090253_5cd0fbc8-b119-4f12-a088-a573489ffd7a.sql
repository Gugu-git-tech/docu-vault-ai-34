CREATE POLICY "documents_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'approver'))
  );
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(),'admin'));