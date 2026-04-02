
-- Shop items catalog
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL DEFAULT 100,
  rarity text NOT NULL DEFAULT 'common',
  preview_emoji text NOT NULL DEFAULT '🏏',
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop items" ON public.shop_items
  FOR SELECT TO authenticated USING (true);

-- User purchases
CREATE TABLE public.user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id),
  equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.user_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON public.user_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases" ON public.user_purchases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Equipped cosmetics on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_bat_skin text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_vs_effect text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_avatar_frame text DEFAULT NULL;
