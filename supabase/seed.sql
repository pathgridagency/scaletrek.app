-- ScaleTrek seed data
-- Optional. Run after schema.sql to populate the default currency list, feature flags,
-- and (only on a fresh dev project) a small set of demo accounts.
--
-- Production projects should run only the "Currencies & feature flags" sections.
-- Demo users are intentionally created via the admin API outside this file because
-- Supabase auth.users rows cannot be inserted with plain SQL.

-- ─────────────────── Currencies (top global + MAD) ─────────────
insert into currencies (code, name, symbol, decimals, sort_order) values
  ('USD', 'US Dollar',         '$',   2, 1),
  ('EUR', 'Euro',               '€',   2, 2),
  ('GBP', 'British Pound',      '£',   2, 3),
  ('MAD', 'Moroccan Dirham',    'MAD', 2, 4),
  ('AED', 'UAE Dirham',         'AED', 2, 5),
  ('SAR', 'Saudi Riyal',        'SAR', 2, 6),
  ('EGP', 'Egyptian Pound',     'E£',  2, 7),
  ('JPY', 'Japanese Yen',       '¥',   0, 8),
  ('CNY', 'Chinese Yuan',       '¥',   2, 9),
  ('INR', 'Indian Rupee',       '₹',   2, 10),
  ('BRL', 'Brazilian Real',     'R$',  2, 11),
  ('TRY', 'Turkish Lira',       '₺',   2, 12),
  ('CAD', 'Canadian Dollar',    'CA$', 2, 13),
  ('AUD', 'Australian Dollar',  'A$',  2, 14),
  ('CHF', 'Swiss Franc',        'CHF', 2, 15),
  ('ZAR', 'South African Rand', 'R',   2, 16),
  ('NGN', 'Nigerian Naira',     '₦',   2, 17),
  ('KES', 'Kenyan Shilling',    'KSh', 2, 18),
  ('SGD', 'Singapore Dollar',   'S$',  2, 19),
  ('HKD', 'Hong Kong Dollar',   'HK$', 2, 20)
on conflict (code) do nothing;

-- ─────────────────── Feature flags ─────────────────────────────
insert into feature_flags (key, enabled, description) values
  ('comments',          true,  'Comments on milestone posts'),
  ('bookmarks',         true,  'Save posts for later'),
  ('image_attachments', true,  'Image uploads on posts'),
  ('e2e_chat',          true,  'End-to-end encrypted messaging'),
  ('push_notifications',true,  'Mobile push notifications'),
  ('verification_kyc',  true,  'Identity verification workflow'),
  ('investor_signups',  true,  'Allow new investor accounts'),
  ('multi_currency',    true,  'Display amounts in user-preferred currency'),
  ('rtl_locales',       true,  'Right-to-left language support')
on conflict (key) do nothing;
