-- Habilita RLS na tabela 'store_profiles' se ainda não estiver habilitado
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;

-- Opcional: Remova políticas de leitura muito amplas se existirem (ex: "Enable read access for all users")
-- Verifique o nome da sua política no painel do Supabase e ajuste se necessário.
-- Se o nome for diferente, você precisará encontrar o nome correto ou deletá-la manualmente.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.store_profiles;

-- Permite que usuários anônimos (anon) leiam perfis de loja.
-- A lógica da aplicação (StoreFront) é responsável por filtrar pelo 'storeId' correto.
-- Esta política apenas garante que o perfil está vinculado a um usuário existente.
CREATE POLICY "Allow anon select for store_profiles"
ON public.store_profiles FOR SELECT TO anon USING (
  user_id IS NOT NULL
);

-- Permite que usuários autenticados (donos de loja) gerenciem (SELECT, INSERT, UPDATE, DELETE)
-- seus próprios perfis de loja, vinculados ao seu 'user_id'.
CREATE POLICY "Allow authenticated users to manage their own store_profiles"
ON public.store_profiles FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);