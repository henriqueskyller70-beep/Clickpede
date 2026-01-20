-- Remove a coluna 'store_id' da tabela 'orders'
ALTER TABLE public.orders
DROP COLUMN IF EXISTS store_id;