-- Reject phone-like usernames even when digits are separated by allowed punctuation.
alter table public.profiles
  drop constraint profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[A-Za-z][A-Za-z0-9_-]{2,23}$'
      and char_length(regexp_replace(username, '[^0-9]', '', 'g')) < 7
      and lower(username) <> all (
        array[
          'admin',
          'administrator',
          'moderator',
          'root',
          'security',
          'staff',
          'support',
          'system',
          'help',
          'official',
          'owntheperk',
          'own_the_perk',
          'own-the-perk',
          'null',
          'undefined'
        ]::text[]
      )
      and lower(username) !~ '(fuck|shit|bitch|cunt|nigger|faggot)'
    )
  );
