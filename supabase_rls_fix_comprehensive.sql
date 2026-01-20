-- Certifique-se de que a RLS está ATIVADA para a tabela 'orders'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Política para INSERT (usuários anônimos na vitrine)
-- Permite que usuários anônimos (anon) insiram novos pedidos,
-- desde que o 'storeid' do pedido seja preenchido (com o ID do dono da loja).
-- Isso é crucial para a vitrine pública.
DROP POLICY IF EXISTS "Allow anon insert for orders with matching store_id" ON public.orders;
CREATE POLICY "Allow anon insert for orders with matching store_id"
ON public.orders
FOR INSERT TO anon
WITH CHECK (storeid IS NOT NULL);

-- 2. Política para SELECT (dono da loja)
-- Permite que o dono da loja (authenticated) veja APENAS os seus próprios pedidos.
DROP POLICY IF EXISTS "Allow authenticated users to view their own orders" ON public.orders;
CREATE POLICY "Allow authenticated users to view their own orders"
ON public.orders
FOR SELECT TO authenticated
USING (storeid = auth.uid());

-- 3. Política para UPDATE (dono da loja)
-- Permite que o dono da loja (authenticated) atualize APENAS os seus próprios pedidos.
DROP POLICY IF EXISTS "Allow authenticated users to update their own orders" ON public.orders;
CREATE POLICY "Allow authenticated users to update their own orders"
ON public.orders
FOR UPDATE TO authenticated
USING (storeid = auth.uid());

-- 4. Política para DELETE (dono da loja)
-- Permite que o dono da loja (authenticated) delete APENAS os seus próprios pedidos.
DROP POLICY IF EXISTS "Allow authenticated users to delete their own orders" ON public.orders;
CREATE POLICY "Allow authenticated users to delete their own orders"
ON public.orders
FOR DELETE TO authenticated
USING (storeid = auth.uid());

-- Opcional: Se você quiser que usuários anônimos NÃO possam ver NENHUM pedido,
-- não crie uma política SELECT para 'anon'. Por padrão, sem uma política SELECT,
-- o acesso é negado.