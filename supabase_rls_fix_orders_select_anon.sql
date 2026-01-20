-- 1. Remova a política existente que permite leitura para todos (se ela tiver o nome exato)
-- Verifique o nome da sua política no painel do Supabase e ajuste se necessário.
-- Se o nome for diferente, você precisará encontrar o nome correto ou deletá-la manualmente.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;

-- 2. Crie uma política que explicitamente NÃO permite que usuários anônimos leiam pedidos.
-- Clientes anônimos só precisam INSERIR pedidos, não ler o histórico de pedidos de ninguém.
CREATE POLICY "Deny anon select for orders"
ON public.orders FOR SELECT TO anon USING (
  FALSE
);

-- 3. (Opcional, mas recomendado) Se a sua política "Allow authenticated users to manage their own orders"
-- não cobre explicitamente o SELECT, certifique-se de que ela o faça.
-- A política que você já tem ("Allow authenticated users to manage their own orders" FOR ALL USING (auth.uid() = store_id) WITH CHECK (auth.uid() = store_id))
-- já cobre o SELECT para usuários autenticados da sua própria loja, então esta etapa pode não ser necessária se essa política já estiver ativa e correta.