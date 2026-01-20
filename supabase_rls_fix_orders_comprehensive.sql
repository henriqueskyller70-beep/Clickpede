-- 1. Habilita RLS na tabela 'orders' se ainda não estiver habilitado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as políticas RLS existentes na tabela 'orders'
-- Isso garante um estado limpo para aplicar as novas políticas sem conflitos.
DROP POLICY IF EXISTS "Allow anon insert for orders with store_id" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Deny anon select for orders" ON public.orders;
-- Adicione aqui qualquer outro nome de política que você possa ter criado para 'orders'

-- 3. Política: Permitir que usuários anônimos (clientes) insiram novos pedidos
-- Condição: O 'store_id' deve ser fornecido no registro do pedido.
CREATE POLICY "Allow anon insert for orders with store_id"
ON public.orders FOR INSERT TO anon WITH CHECK (
  store_id IS NOT NULL
);

-- 4. Política: Negar que usuários anônimos (clientes) leiam pedidos
-- Clientes anônimos só precisam criar pedidos, não visualizar o histórico de pedidos de ninguém.
CREATE POLICY "Deny anon select for orders"
ON public.orders FOR SELECT TO anon USING (
  FALSE
);

-- 5. Política: Permitir que usuários autenticados (donos de loja) gerenciem seus próprios pedidos
-- Isso inclui SELECT, INSERT, UPDATE e DELETE.
CREATE POLICY "Allow authenticated users to manage their own orders"
ON public.orders FOR ALL TO authenticated USING (
  auth.uid() = store_id
) WITH CHECK (
  auth.uid() = store_id
);