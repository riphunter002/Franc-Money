-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "average_price" DECIMAL(65,30) NOT NULL,
    "asset_name" TEXT,
    "current_price" DECIMAL(65,30),
    "price_updated_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investments_ticker_user_id_key" ON "investments"("ticker", "user_id");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
