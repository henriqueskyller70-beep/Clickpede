-- Adicionar a coluna rejection_reason à tabela orders
ALTER TABLE public.orders
ADD COLUMN rejection_reason TEXT;

-- Opcional: Adicionar uma política de RLS para permitir que o usuário proprietário atualize o rejection_reason
-- Se você já tem uma política de UPDATE para 'user_id', pode precisar ajustá-la.
-- Exemplo de política de UPDATE que permite ao proprietário do pedido atualizar o status e o motivo:
-- DROP POLICY IF EXISTS "Allow owner to update orders" ON public.orders;
-- CREATE POLICY "Allow owner to update orders"
--   ON public.orders
--   FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Certifique-se de que a política de SELECT para orders já existe e permite a leitura pública ou autenticada.
-- Se não existir, crie uma:
-- CREATE POLICY "Allow public read for orders"
--   ON public.orders
--   FOR SELECT
--   TO public, authenticated
--   USING (true);

-- Se você já tem uma política de INSERT, certifique-se de que ela permite a inserção do rejection_reason (se aplicável).
-- Exemplo:
-- CREATE POLICY "Allow authenticated users to insert orders"
--   ON public.orders
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = user_id);