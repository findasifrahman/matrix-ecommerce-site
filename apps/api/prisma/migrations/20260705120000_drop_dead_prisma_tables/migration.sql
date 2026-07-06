-- Drop legacy tables from the old BridgeChina/OTAPI/Twilio stack.
-- These tables are no longer modeled in prisma/schema.ecommerce.prisma.

DROP TABLE IF EXISTS "twilio_message_statuses" CASCADE;
DROP TABLE IF EXISTS "twilio_webhook_events" CASCADE;
DROP TABLE IF EXISTS "external_search_result_items" CASCADE;
DROP TABLE IF EXISTS "external_search_cache" CASCADE;
DROP TABLE IF EXISTS "external_hot_items" CASCADE;
DROP TABLE IF EXISTS "external_catalog_items" CASCADE;
DROP TABLE IF EXISTS "product_title_translations" CASCADE;
DROP TABLE IF EXISTS "site_settings" CASCADE;
