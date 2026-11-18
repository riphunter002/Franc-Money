-- Classificação opcional: o histórico permanece sem banco/método até identificação explícita.
ALTER TABLE "transactions" ADD COLUMN "bank" TEXT, ADD COLUMN "payment_method" TEXT;
ALTER TABLE "recurring_transactions" ADD COLUMN "bank" TEXT, ADD COLUMN "payment_method" TEXT;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_check" CHECK ("bank" IN ('NUBANK', 'PICPAY', 'PAN')), ADD CONSTRAINT "transactions_method_check" CHECK ("payment_method" IN ('PIX', 'DEBIT', 'CREDIT', 'PIX_CREDIT'));
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_bank_check" CHECK ("bank" IN ('NUBANK', 'PICPAY', 'PAN')), ADD CONSTRAINT "recurring_method_check" CHECK ("payment_method" IN ('PIX', 'DEBIT', 'CREDIT', 'PIX_CREDIT'));
