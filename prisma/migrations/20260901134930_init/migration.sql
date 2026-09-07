-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'DEBIT', 'CREDIT', 'PIX', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "OriginType" AS ENUM ('MANUAL', 'PDF_IMPORT', 'OPEN_FINANCE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_CATEGORIZATION', 'REVIEWED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "expense_type" "ExpenseType",
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachment_url" TEXT,
    "origin" "OriginType" NOT NULL DEFAULT 'MANUAL',
    "external_id" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'REVIEWED',
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT,
    "subcategory_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_external_id_key" ON "transactions"("external_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
