// ScaleTrek legal documents. Bump VERSION when the substantive content changes
// so we can re-prompt users for acceptance.
//
// IMPORTANT: This is a drafted template, NOT legal advice. Have a lawyer in
// your operating jurisdiction review it before public launch.

export const PRIVACY_VERSION = '1.0.0';
export const TERMS_VERSION = '1.1.0';

export const PRIVACY_POLICY = `# Privacy Policy

**Effective date:** May 19, 2026
**Version:** ${PRIVACY_VERSION}

ScaleTrek ("we", "us", "our") respects your privacy. This Privacy Policy explains
what information we collect, how we use it, and the choices you have.

## 1. Information we collect

**Account information.** When you create an account, we collect your name,
chosen username, email, password (hashed), role (Dreamer or Investor), and any
optional profile fields you provide (bio, industry, company, social links).

**Content you create.** Posts, photos, videos, stories, comments, direct
messages, deal-pipeline entries, and pitch decks you upload. End-to-end
encrypted direct messages are stored in ciphertext only — we cannot read them.

**Usage data.** App actions like likes, signals, follows, and feature usage.

**Device data.** Device type, OS version, language, timezone, and an Expo push
token (if you grant notification permission).

**Authentication providers.** If you sign in with Google, LinkedIn, GitHub, X,
Facebook, or Apple, we receive your email, name, and avatar from that provider.

## 2. How we use information

- Operate, maintain, and improve ScaleTrek
- Personalize your feed and suggestions
- Send notifications you have opted into
- Detect and prevent fraud, abuse, and policy violations
- Comply with legal obligations

## 3. How we share information

We do **not** sell your personal information. We share data only:

- With other users, per the visibility settings you choose (e.g., investors are
  hidden by default until you reveal yourself)
- With service providers that operate the platform under contract (Supabase for
  database and storage, Expo for push delivery, OAuth providers when you sign
  in with them)
- When required by law, valid legal process, or to protect rights and safety

## 4. Your choices

- **Edit or delete content** from your profile or feed at any time
- **Block** users you don't want to interact with
- **Toggle notifications** in Settings
- **Revoke OAuth** access from the linked provider
- **Delete your account** — contact us to permanently remove your data; backups
  are purged within 30 days

## 5. Investor privacy

If you sign up as an Investor, your identity is hidden from founders by
default. Founders only see "Verified Investor" until you choose to reveal
yourself to them individually or globally.

## 6. Direct messages

Direct messages are end-to-end encrypted. Your device generates a key pair on
first launch; messages are encrypted with the recipient's public key and only
the recipient can decrypt them. We store ciphertext only.

## 7. Children

ScaleTrek is not intended for users under 16. We do not knowingly collect data
from anyone under 16. If you believe a child has registered, contact us and we
will remove the account.

## 8. Security

We use industry-standard protections: TLS in transit, row-level security in our
database, hashed passwords (Argon2), and least-privilege access for our team.
No system is perfectly secure — please choose a strong password.

## 9. International transfers

Your data is stored in the European Union (Supabase eu-west-1). If you are
located elsewhere, your data is transferred to and processed there.

## 10. Changes

We may update this policy. We will notify you in-app and bump the version. Your
continued use after the effective date means you accept the new terms.

## 11. Contact

For privacy questions or to exercise your rights, email
**privacy@scaletrek.app**.
`;

export const TERMS_OF_SERVICE = `# Terms of Service

**Effective date:** May 20, 2026
**Version:** ${TERMS_VERSION}

Welcome to ScaleTrek. By creating an account or using the app you agree to these
Terms. They are meant to be fair to both you and us — they set out what you can
expect from ScaleTrek and what we expect from you. Please read them carefully.

## 1. Eligibility

You must be at least 16 years old to use ScaleTrek. By using the app you
represent that you meet this requirement.

## 2. Your account

You are responsible for keeping your password confidential and for all activity
under your account. Notify us immediately of any unauthorized access. If
unauthorized access happens despite your reasonable care, we will work with you
in good faith to secure your account.

## 3. Your content

You retain full ownership of everything you post. You grant ScaleTrek a
worldwide, non-exclusive, royalty-free license to host, display, and distribute
your content **only as needed to operate and promote the service**. This
license ends when you delete the content or close your account, except for
(a) copies kept in routine backups for a limited period and (b) content other
users have already re-shared or saved within the app. We will never sell your
content or use it in external advertising without your explicit consent.

You are responsible for your content. Do not post:
- Illegal content, including content that infringes someone else's rights
- Harassment, hate speech, threats, or doxxing
- Spam, scams, or misleading investment claims
- Sexual content involving minors — we report this to authorities
- Malware or attempts to compromise the service or other users

We may remove content that violates these rules. Except where the law or an
urgent safety risk requires immediate action, we will tell you what was removed
and why, and you may appeal the decision.

## 4. Investor and founder interactions

ScaleTrek is a platform for connection — it is **not** a broker-dealer or
investment adviser. Nothing in the app constitutes investment advice, an offer
to sell or a solicitation to buy securities, or a guarantee of returns.

You alone are responsible for your investment decisions and for complying with
the securities laws of your jurisdiction. NDA-gated deck sharing is a
convenience — it does not replace your own legal counsel.

## 5. Subscriptions

ScaleTrek offers paid plans (Pro, Elite) on monthly and yearly intervals.
Subscriptions auto-renew until you cancel, and we will remind you before a
yearly plan renews. You can cancel at any time from Settings → Subscription;
you keep access until the end of the paid period.

Payments are processed by third-party providers. If you cancel a new
subscription or a renewal within 14 days and have not made substantial use of
the paid features in that time, we will refund you in full. Outside that
window, refunds are at our discretion, and we always honor any refund rights
the law of your country gives you. If we change subscription prices, the new
price applies only from your next renewal, and we will tell you in advance.

## 6. Stories and ephemeral content

Stories are deleted from the platform 24 hours after they are posted. We make
reasonable efforts to remove them, but other users may have already viewed or
captured them — do not post anything you would not want preserved.

## 7. Termination

We may suspend or terminate your account if you breach these Terms or pose a
risk to other users. Where it is reasonable and lawful to do so, we will tell
you why and give you a chance to respond or appeal. If we end your account
through no fault of your own, we will refund the unused portion of any paid
subscription. You can delete your account at any time, and you may ask us for a
copy of your content before you do.

## 8. Warranties

The service is provided "as is" without warranties of any kind. We do not
guarantee uptime, accuracy, or that the service will meet your needs. Some
jurisdictions do not allow the exclusion of certain warranties; if that applies
to you, the minimum warranties required by your local law still apply.

## 9. Limitation of liability

To the maximum extent permitted by law, ScaleTrek is not liable for any
indirect, incidental, special, or consequential damages, or any loss of profits
or revenue, arising from your use of the service. Our total liability for any
claim is limited to the greater of (a) the amount you paid us in the 12 months
before the claim or (b) USD 100.

Nothing in these Terms limits liability that cannot be limited by law —
including liability for death or personal injury caused by negligence, for
fraud, or for willful misconduct.

## 10. Governing law and disputes

These Terms are governed by the laws of Morocco, without regard to conflict of
laws principles. Disputes will be resolved in the courts of Casablanca.

If you use ScaleTrek as a consumer, this section does not deprive you of the
protection of the mandatory consumer-protection laws of your country of
residence, and you may bring claims in the courts of that country.

Before bringing a formal claim, please contact us at **support@scaletrek.app**
so we can try to resolve the issue with you directly. We will do the same
before bringing any claim against you.

## 11. Changes

We may update these Terms. For minor changes we will notify you in-app and bump
the version. For material changes that affect your rights, we will give you at
least 30 days' notice before they take effect; if you do not agree, you may
close your account before then. Changes are not retroactive — they do not apply
to disputes that arose before their effective date. Continued use after the
effective date means you accept the updated Terms.

## 12. Contact

Questions? Email **support@scaletrek.app**.
`;
