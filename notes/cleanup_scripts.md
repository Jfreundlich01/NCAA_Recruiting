# Database Cleanup Scripts

Run in Supabase SQL Editor when uploads get interrupted.

## 1. Reset Stuck Batches

```sql
UPDATE screenshot_batches
SET status = 'pending'
WHERE status = 'processing';
```

## 2. Delete Orphaned Screenshots

```sql
DELETE FROM storage.objects
WHERE bucket_id = 'screenshots'
AND name NOT IN (
  SELECT REPLACE(screenshot_url, 'screenshots/', '')
  FROM recruits
  WHERE screenshot_url IS NOT NULL
);
```

## 3. Delete Incomplete Recruits

```sql
DELETE FROM recruits
WHERE stats IS NULL
AND screenshot_url IS NOT NULL;
```

## Run Order

1. Reset batches
2. Clean orphaned screenshots
3. Remove incomplete records
