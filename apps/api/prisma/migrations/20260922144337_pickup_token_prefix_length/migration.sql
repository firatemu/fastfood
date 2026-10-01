-- AlterTable
ALTER TABLE "order_pickup_tokens" ALTER COLUMN "token_prefix" SET DATA TYPE VARCHAR(32);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "display_number" SET DEFAULT 'SP00001';
