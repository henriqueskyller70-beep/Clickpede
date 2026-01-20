-- Esta política permite que usuários anônimos (anon) insiram novos pedidos
-- desde que o 'store_id' seja fornecido no registro.
CREATE POLICY "Allow anon insert with store_id"
ON public.orders FOR INSERT WITH CHECK (
  (auth.role() = 'anon' AND store_id IS NOT NULL)
);