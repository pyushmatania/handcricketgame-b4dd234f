
DROP POLICY "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications for friends" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    user_id IN (SELECT friend_id FROM public.friends WHERE friends.user_id = auth.uid())
    OR user_id = auth.uid()
  );
