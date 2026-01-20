-- Remover a política existente de INSERT para 'anon' se ela estiver causando o problema
-- DROP POLICY IF EXISTS "Sua política antiga de INSERT para anon" ON public.orders;

-- Criar ou substituir a política para permitir que usuários anônimos insiram pedidos
-- desde que o campo 'store_id' no novo pedido NÃO seja NULO.
-- O 'store_id' será o ID do dono da loja, passado pelo frontend da vitrine.
CREATE POLICY "Allow anon insert for orders with matching store_id"
ON public.orders
FOR INSERT TO anon
WITH CHECK (store_id IS NOT NULL);

-- Certifique-se de que a RLS está ATIVADA para a tabela 'orders'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;