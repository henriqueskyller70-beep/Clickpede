-- Habilita RLS na tabela 'products' se ainda não estiver habilitado
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Permite que usuários anônimos (anon) leiam produtos
-- desde que o 'group_id' do produto esteja vinculado a um 'user_id' (store_id) específico.
-- (Assumindo que 'products' tem uma coluna 'user_id' ou 'store_id' para vincular à loja)
-- Se a coluna for 'user_id', use 'user_id'. Se for 'store_id', use 'store_id'.
CREATE POLICY "Allow anon select for products by store_id"
ON public.products FOR SELECT TO anon USING (
  store_id IS NOT NULL -- Garante que o produto está vinculado a uma loja
);

-- Permite que usuários autenticados (donos de loja) gerenciem seus próprios produtos
CREATE POLICY "Allow authenticated users to manage their own products"
ON public.products FOR ALL USING (
  auth.uid() = store_id
) WITH CHECK (
  auth.uid() = store_id
);