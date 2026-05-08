-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "priceIn" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- Add new nullable columns first (for safe backfill)
ALTER TABLE "Sale" ADD COLUMN "productVariantId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "productVariantId" TEXT;

-- Backfill categories from old Stock rows
INSERT INTO "Category" ("id", "name", "createdAt", "updatedAt")
SELECT
  'cat_' || md5("category"),
  "category",
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "category"
  FROM "Stock"
  WHERE "category" IS NOT NULL AND "category" <> ''
) s;

-- Backfill brands from old Stock rows
INSERT INTO "Brand" ("id", "name", "createdAt", "updatedAt")
SELECT
  'brand_' || md5("brand"),
  "brand",
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "brand"
  FROM "Stock"
  WHERE "brand" IS NOT NULL AND "brand" <> ''
) s;

-- Backfill products from old Stock rows (one product per branch+brand+category+prices)
INSERT INTO "Product" (
  "id",
  "name",
  "brandId",
  "categoryId",
  "branchId",
  "priceIn",
  "sellingPrice",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT
  'prod_' || md5(
    COALESCE("s"."branchId", '') || '|' ||
    COALESCE("s"."brand", '') || '|' ||
    COALESCE("s"."category", '') || '|' ||
    COALESCE("s"."priceIn"::text, '') || '|' ||
    COALESCE("s"."sellingPrice"::text, '')
  ),
  COALESCE(NULLIF(TRIM("s"."brand"), ''), 'Product') || ' ' || COALESCE(NULLIF(TRIM("s"."category"), ''), 'Item'),
  'brand_' || md5("s"."brand"),
  'cat_' || md5("s"."category"),
  "s"."branchId",
  "s"."priceIn"::decimal(12, 2),
  "s"."sellingPrice"::decimal(12, 2),
  NOW(),
  NOW()
FROM "Stock" "s";

-- Backfill variants from old Stock rows (1:1 with previous Stock records)
INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "size",
  "color",
  "quantity",
  "barcode",
  "createdAt",
  "updatedAt"
)
SELECT
  'var_' || md5("s"."id"),
  'prod_' || md5(
    COALESCE("s"."branchId", '') || '|' ||
    COALESCE("s"."brand", '') || '|' ||
    COALESCE("s"."category", '') || '|' ||
    COALESCE("s"."priceIn"::text, '') || '|' ||
    COALESCE("s"."sellingPrice"::text, '')
  ),
  "s"."size",
  NULL,
  "s"."quantity",
  "s"."barcode",
  "s"."createdAt",
  "s"."updatedAt"
FROM "Stock" "s";

-- Backfill Sale/Transfer foreign keys
UPDATE "Sale" "sa"
SET "productVariantId" = 'var_' || md5("sa"."stockId")
WHERE "sa"."stockId" IS NOT NULL;

UPDATE "StockTransfer" "st"
SET "productVariantId" = 'var_' || md5("st"."stockId")
WHERE "st"."stockId" IS NOT NULL;

-- Drop old FKs and old columns
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_stockId_fkey";
ALTER TABLE "StockTransfer" DROP CONSTRAINT "StockTransfer_stockId_fkey";
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_branchId_fkey";

ALTER TABLE "Sale" DROP COLUMN "stockId";
ALTER TABLE "StockTransfer" DROP COLUMN "stockId";

-- Enforce new required columns after backfill
ALTER TABLE "Sale" ALTER COLUMN "productVariantId" SET NOT NULL;
ALTER TABLE "StockTransfer" ALTER COLUMN "productVariantId" SET NOT NULL;

-- Drop old stock table
DROP TABLE "Stock";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Product_branchId_categoryId_brandId_idx" ON "Product"("branchId", "categoryId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");

-- CreateIndex
CREATE INDEX "ProductVariant_size_color_idx" ON "ProductVariant"("size", "color");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON "ProductVariant"("productId", "size", "color");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
