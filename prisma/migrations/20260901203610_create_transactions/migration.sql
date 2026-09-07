/*
  Warnings:

  - You are about to drop the column `account_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `attachment_url` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `expense_type` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `is_recurring` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `review_status` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `subcategory_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subcategories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `title` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subcategories" DROP CONSTRAINT "subcategories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_subcategory_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "transactions_external_id_key";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "account_id",
DROP COLUMN "attachment_url",
DROP COLUMN "category_id",
DROP COLUMN "description",
DROP COLUMN "expense_type",
DROP COLUMN "external_id",
DROP COLUMN "is_recurring",
DROP COLUMN "notes",
DROP COLUMN "origin",
DROP COLUMN "payment_method",
DROP COLUMN "review_status",
DROP COLUMN "subcategory_id",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "subcategories";

-- DropEnum
DROP TYPE "ExpenseType";

-- DropEnum
DROP TYPE "OriginType";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "ReviewStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
