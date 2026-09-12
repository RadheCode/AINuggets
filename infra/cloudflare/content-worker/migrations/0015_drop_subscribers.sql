-- Removes the subscribers table added in migration 0014.
-- 0014 remains as immutable history; this migration cleans up the
-- subscriber capture feature that was reverted from the product.
DROP TABLE IF EXISTS subscribers;