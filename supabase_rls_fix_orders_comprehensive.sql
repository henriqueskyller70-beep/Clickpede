-- Habilita RLS na tabela 'orders' se ainda não estiver habilitado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Remova políticas de leitura muito amplas se existirem (ex: "Enable read access for all users")
-- Verifique o nome da sua política no painel do Supabase e ajuste se necessário.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Deny anon select for orders" ON public.orders; -- Remova a política de negação anterior se ela foi criada
DROP POLICY IF EXISTS "Allow anon insert for orders with store_id" ON public.orders; -- Remova a política de insert anterior
DROP POLICY IF EXISTS "Allow authenticated users to manage their own orders" ON public.orders; -- Remova a política de autenticados anterior

-- 2. Negar explicitamente que usuários anônimos leiam pedidos.
-- Clientes anônimos só precisam INSERIR pedidos, não ler o histórico de pedidos de ninguém.
CREATE POLICY "Deny anon select for orders"
ON public.orders FOR SELECT TO anon USING (
  FALSE
);

-- 3. Permite que usuários anônimos (anon) insiram novos pedidos.
-- A condição WITH CHECK garante que o 'user_id' seja sempre preenchido.
CREATE POLICY "Allow anon insert for orders with user_id"
ON public.orders FOR INSERT TO anon WITH CHECK (
  user_id IS NOT NULL
);

-- 4. Permite que usuários autenticados (donos de loja) gerenciem (SELECT, INSERT, UPDATE, DELETE)
-- seus próprios pedidos, vinculados ao seu 'user_id'.
CREATE POLICY "Allow authenticated users to manage their own orders"
ON public.orders FOR ALL TO authenticated USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);