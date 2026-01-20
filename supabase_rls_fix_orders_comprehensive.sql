-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Deny anon select for orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon insert for orders with user_id" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders; -- Just in case

-- Enable RLS on the 'orders' table if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- CRUCIAL: Grant base INSERT permission to the anon role.
-- RLS policies will then refine this, but the base permission must exist.
GRANT INSERT ON public.orders TO anon;

-- Deny explicit SELECT for anon users (they should only insert)
CREATE POLICY "Deny anon select for orders"
ON public.orders FOR SELECT TO anon USING (
  FALSE
);

-- Allow anon users to INSERT new orders, ensuring 'user_id' is provided
CREATE POLICY "Allow anon insert for orders with user_id"
ON public.orders FOR INSERT TO anon WITH CHECK (
  user_id IS NOT NULL
);

-- Allow authenticated users (store owners) to manage their own orders
CREATE POLICY "Allow authenticated users to manage their own orders"
ON public.orders FOR ALL TO authenticated USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);