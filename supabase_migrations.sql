ALTER TABLE public.store_profiles
ADD COLUMN notification_sound TEXT DEFAULT 'clock-alarm-8761.mp3';

ALTER TABLE public.store_profiles
ADD COLUMN notification_volume NUMERIC DEFAULT 0.7;

ALTER TABLE public.store_profiles
ADD COLUMN repeat_notification_sound BOOLEAN DEFAULT FALSE;