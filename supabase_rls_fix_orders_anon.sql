-- Esta política permite que usuários anônimos (anon) insiram novos pedidos
-- na tabela 'orders', desde que o 'store_id' seja fornecido no registro.
-- Isso garante que o pedido sempre esteja vinculado a uma loja.
CREATE POLICY "Allow anon insert for orders with store_id"
ON public.orders FOR INSERT WITH CHECK (
  (auth.role() = 'anon' AND store_id IS NOT NULL)
);