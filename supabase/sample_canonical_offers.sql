-- Sample canonical offers for development/testing only.
-- These are illustrative records, not claims about currently available real-world card offers.
-- Assumes merchants already exist in public.merchants and reward types include:
-- STATEMENT_CREDIT, CASH_BACK, PERCENT_BACK.

with sample_offers (
  merchant_name,
  title,
  description,
  required_spend,
  reward_amount,
  reward_type,
  expiration_date,
  status
) as (
  values
    (
      'Adobe',
      'Spend $600, Get $250 Back',
      'Sample development offer: spend $600 and receive a $250 statement credit.',
      600.00::numeric,
      250.00::numeric,
      'STATEMENT_CREDIT'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Dell',
      'Spend $500, Get $100 Back',
      'Sample development offer: spend $500 and receive a $100 statement credit.',
      500.00::numeric,
      100.00::numeric,
      'STATEMENT_CREDIT'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Dell',
      'Spend $5000, Get $1000 Back',
      'Sample development offer: spend $5000 and receive a $1000 statement credit.',
      5000.00::numeric,
      1000.00::numeric,
      'STATEMENT_CREDIT'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Nike',
      'Spend $150, Get $30 Back',
      'Sample development offer: spend $150 and receive $30 back.',
      150.00::numeric,
      30.00::numeric,
      'CASH_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Samsung',
      'Spend $1,000, Get $150 Back',
      'Sample development offer: spend $1,000 and receive a $150 statement credit.',
      1000.00::numeric,
      150.00::numeric,
      'STATEMENT_CREDIT'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Marriott',
      'Spend $500, Get $100 Back',
      'Sample development offer: spend $500 and receive $100 back.',
      500.00::numeric,
      100.00::numeric,
      'CASH_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Best Buy',
      'Get 15% Back, Up to $75',
      'Sample development offer: receive 15% back, up to $75.',
      0.00::numeric,
      15.00::numeric,
      'PERCENT_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Walmart',
      'Spend $200, Get $25 Back',
      'Sample development offer: spend $200 and receive $25 back.',
      200.00::numeric,
      25.00::numeric,
      'CASH_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Target',
      'Spend $150, Get $20 Back',
      'Sample development offer: spend $150 and receive $20 back.',
      150.00::numeric,
      20.00::numeric,
      'CASH_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'Dropbox',
      'Spend $150, Get $50 Back',
      'Sample development offer: spend $150 and receive a $50 statement credit.',
      150.00::numeric,
      50.00::numeric,
      'STATEMENT_CREDIT'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    ),
    (
      'FedEx',
      'Get 20% Back, Up to $50',
      'Sample development offer: receive 20% back, up to $50.',
      0.00::numeric,
      20.00::numeric,
      'PERCENT_BACK'::public.offer_reward_type,
      date '2027-12-31',
      'ACTIVE'::public.canonical_offer_status
    )
)
insert into public.offers (
  merchant_id,
  title,
  description,
  required_spend,
  reward_amount,
  reward_type,
  expiration_date,
  status
)
select
  m.id,
  s.title,
  s.description,
  s.required_spend,
  s.reward_amount,
  s.reward_type,
  s.expiration_date,
  s.status
from sample_offers s
join public.merchants m
  on lower(btrim(m.name)) = lower(btrim(s.merchant_name))
on conflict do nothing;

-- Optional verification query:
select
  m.name as merchant,
  o.title,
  o.required_spend,
  o.reward_amount,
  o.reward_type,
  o.expiration_date,
  o.status
from public.offers o
join public.merchants m on m.id = o.merchant_id
where o.expiration_date = date '2027-12-31'
order by m.name, o.title;
