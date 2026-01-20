-- Habilita RLS na tabela 'orders' se ainda não estiver habilitado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Cria uma política para permitir que usuários anônimos (não autenticados) insiram pedidos
-- desde que o 'store_id' seja fornecido.
CREATE POLICY "Allow anonymous insert for orders with store_id"
ON public.orders FOR INSERT WITH CHECK (
  (auth.role() = 'anon' AND store_id IS NOT NULL)
);

-- Opcional: Se você também quiser que usuários autenticados (admins da loja) possam inserir pedidos,
-- você pode adicionar uma política separada ou ajustar a existente.
-- Por exemplo, para permitir que o admin da loja insira pedidos para sua própria loja:
CREATE POLICY "Allow authenticated users to manage their own orders"
ON public.orders FOR ALL USING (
  auth.uid() = store_id
) WITH CHECK (
  auth.uid() = store_id
);