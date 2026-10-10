-- Enum additions are isolated so later migrations can safely use the new values.

alter type public.notification_type add value if not exists 'SAVED_OFFER_NEW_LISTING';
alter type public.notification_type add value if not exists 'SAVED_OFFER_LOWER_ASK';
alter type public.notification_type add value if not exists 'SAVED_OFFER_EXPIRING_SOON';
alter type public.notification_type add value if not exists 'SAVED_OFFER_NO_LISTINGS';
alter type public.notification_type add value if not exists 'SAVED_OFFER_UNAVAILABLE';
