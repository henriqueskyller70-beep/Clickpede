-- Habilita o Row Level Security na tabela 'orders'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- (Opcional) Remove qualquer política de INSERT existente que possa causar conflito
DROP POLICY IF EXISTS "Allow anonymous users to create orders for existing stores" ON public.orders;

-- Cria uma nova política para permitir que usuários anônimos insiram pedidos
-- se o 'user_id' no pedido corresponder a um perfil de loja existente.
CREATE POLICY "Allow anonymous users to create orders for existing stores"
ON public.orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.store_profiles WHERE user_id = orders.user_id)
);