-- Storage policies for screenshots bucket

-- Allow authenticated users to upload screenshots to their own folder
create policy "Users can upload screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to read their own screenshots
create policy "Users can read own screenshots"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own screenshots
create policy "Users can delete own screenshots"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow service role full access (for edge functions)
create policy "Service role has full access to screenshots"
  on storage.objects for all
  to service_role
  using (bucket_id = 'screenshots')
  with check (bucket_id = 'screenshots');
