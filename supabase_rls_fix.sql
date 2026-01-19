-- Policy for 'orders' table to allow unauthenticated users (anon) to create orders
-- This policy ensures that the 'user_id' column is set, linking the order to a store owner.
CREATE POLICY "Allow anon insert for orders with user_id"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NOT NULL);