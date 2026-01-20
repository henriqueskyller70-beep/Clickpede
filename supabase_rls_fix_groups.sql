-- Habilita RLS na tabela 'groups' se ainda não estiver habilitado
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Opcional: Remova políticas de leitura muito amplas se existirem (ex: "Enable read access for all users")
-- Verifique o nome da sua política no painel do Supabase e ajuste se necessário.
-- Se o nome for diferente, você precisará encontrar o nome correto ou deletá-la manualmente.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.groups;

-- Permite que usuários anônimos (anon) leiam grupos de produtos.
-- A lógica da aplicação (StoreFront) é responsável por filtrar pelo 'storeId' correto.
CREATE POLICY "Allow anon select for groups"
ON public.groups FOR SELECT TO anon USING (
  user_id IS NOT NULL
);

-- Permite que usuários autenticados (donos de loja) gerenciem (SELECT, INSERT, UPDATE, DELETE)
-- seus próprios grupos de produtos, vinculados ao seu 'user_id'.
CREATE POLICY "Allow authenticated users to manage their own groups"
ON public.groups FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);