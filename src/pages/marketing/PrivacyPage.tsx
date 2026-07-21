import MarketingLayout from '@/components/marketing/MarketingLayout';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { BRAND } from '@/lib/brand';

const TOC = [
  { id: 'who', label: 'Who we are' },
  { id: 'scope', label: 'Scope' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'use', label: 'How we use your information' },
  { id: 'payments', label: 'Payments and settlement' },
  { id: 'share', label: 'How we share information' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'retention', label: 'Data retention' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights' },
  { id: 'cookies', label: 'Cookies and website data' },
  { id: 'contact', label: 'Contact us' },
];

export default function PrivacyPage() {
  useHashScroll();

  return (
    <MarketingLayout>
      <section className="legal-hero">
        <div className="container">
          <div className="legal-wrap">
            <span className="label">Legal</span>
            <h1>Privacy Policy</h1>
            <div className="meta">How {BRAND.name} collects, uses, and protects personal data.</div>
          </div>
        </div>
      </section>

      <section className="legal-body">
        <div className="container">
          <div className="legal-wrap">
            <div className="toc">
              <h4>Contents</h4>
              <ol>
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </div>

            <h2 id="who">
              <span className="n">01</span>Who we are
            </h2>
            <p>
              IOU Exchange is a trade-receivables platform operated by <strong>UzimaX</strong> (&quot;UzimaX&quot;, &quot;we&quot;,
              &quot;us&quot;, &quot;our&quot;). The product brand is <strong>IOU Exchange</strong>. This Privacy Policy explains how we
              collect, use, disclose, and protect personal data when you or your organisation use the IOU Exchange
              platform and this website (together, the &quot;Platform&quot;).
            </p>
            <p>
              For the purposes of the Kenya Data Protection Act, 2019, UzimaX is the data controller for personal data
              processed through the Platform. Questions about this policy can be sent to the contact address in section
              12.
            </p>

            <h2 id="scope">
              <span className="n">02</span>Scope
            </h2>
            <p>
              This policy applies to individuals who interact with the Platform, including authorised users of buyer,
              supplier, and SPV organisations, platform administrators, and visitors to this website. It covers personal
              data only. Information about organisations and commercial transactions is governed by our agreements with
              those organisations.
            </p>
            <div className="legal-callout">
              <p>
                IOU Exchange is an invite-only platform. We do not collect personal data from members of the general public who
                are not associated with an onboarded organisation, other than basic website-visit information.
              </p>
            </div>

            <h2 id="collect">
              <span className="n">03</span>Information we collect
            </h2>
            <p>We collect the following categories of personal data:</p>
            <h3>Information you or your organisation provide</h3>
            <ul>
              <li>
                <strong>Account and identity data</strong> — name, work email address, phone number, job title, and role
                within your organisation.
              </li>
              <li>
                <strong>Authorisation data</strong> — signatory status, approval certificates, and specimen signatures
                where you act as an authorised signatory for your organisation.
              </li>
              <li>
                <strong>Onboarding data</strong> — information provided when your organisation is onboarded, which may
                include documents naming individuals.
              </li>
            </ul>
            <h3>Information generated through use</h3>
            <ul>
              <li>
                <strong>Transaction and activity data</strong> — records of actions you take on the Platform (invoices
                posted, offers made, consents signed), including timestamps and the account that performed each action,
                retained in our audit logs.
              </li>
              <li>
                <strong>Technical data</strong> — IP address, browser type, device information, and pages visited,
                collected automatically when you use the Platform.
              </li>
            </ul>
            <h3>Information from third parties</h3>
            <ul>
              <li>
                Where your organisation is onboarded via a connected trading platform, we may receive your name, work
                contact details, and role from that platform to establish your IOU Exchange account.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> intentionally collect sensitive personal data (such as health, religious, or
              political information) about individual users. Please do not submit such information through the Platform.
            </p>

            <h2 id="use">
              <span className="n">04</span>How we use your information
            </h2>
            <p>We process personal data to:</p>
            <ul>
              <li>Create and manage user accounts and control access to the correct portal for your role;</li>
              <li>
                Operate the receivables workflow — registration, confirmation, assignment, and settlement visibility;
              </li>
              <li>Verify authorised signatories and apply verified digital signatures to consents and documents;</li>
              <li>
                Send transactional notifications (for example, an invoice awaiting your action, or a consent to sign);
              </li>
              <li>Maintain security, prevent fraud, and keep a complete audit trail of platform activity;</li>
              <li>Respond to your enquiries and provide support;</li>
              <li>Comply with legal and regulatory obligations.</li>
            </ul>
            <p>
              Our lawful bases for processing include the performance of our contract with your organisation, our
              legitimate interests in operating a secure platform, your consent where required, and compliance with legal
              obligations.
            </p>

            <h2 id="payments">
              <span className="n">05</span>Payments and settlement
            </h2>
            <p>
              IOU Exchange orchestrates receivables workflows and provides settlement visibility.{' '}
              <strong>IOU Exchange is not a bank and does not itself move money.</strong> Where funds are disbursed or
              collected, they are handled by licensed settlement partners, who process any payment-related personal data
              under their own privacy terms. We receive and store payment-status data (such as amounts, balances, and due
              dates) to reflect settlement progress on the Platform.
            </p>

            <h2 id="share">
              <span className="n">06</span>How we share information
            </h2>
            <p>We share personal data only as necessary to operate the Platform:</p>
            <ul>
              <li>
                <strong>Between platform participants</strong> — your name and role may be visible to counterparties to a
                transaction (for example, a buyer sees the supplier organisation&apos;s authorised contact) to the extent
                needed to complete the workflow. Reviewer and pricing details are controlled by the Platform&apos;s
                access rules.
              </li>
              <li>
                <strong>Service providers</strong> — hosting, email and SMS delivery, and document storage providers who
                process data on our behalf under contract.
              </li>
              <li>
                <strong>Settlement partners</strong> — licensed partners who execute money movement.
              </li>
              <li>
                <strong>Legal and regulatory</strong> — where required by law, court order, or a competent regulator.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> sell personal data, and we do not share it for third-party advertising.
            </p>

            <h2 id="transfers">
              <span className="n">07</span>International transfers
            </h2>
            <p>
              Where personal data is transferred outside Kenya (for example, to a cloud hosting provider), we take steps
              to ensure it receives a level of protection consistent with the Kenya Data Protection Act, 2019, including
              through appropriate contractual safeguards with our providers.
            </p>

            <h2 id="retention">
              <span className="n">08</span>Data retention
            </h2>
            <p>
              We retain personal data for as long as your organisation uses the Platform and as required to maintain a
              complete and reliable transaction record. Audit and transaction records may be retained after account
              closure to meet legal, regulatory, and dispute-resolution requirements. When data is no longer needed, we
              delete or anonymise it.
            </p>

            <h2 id="security">
              <span className="n">09</span>Security
            </h2>
            <p>
              We protect personal data using role-based access control, encryption in transit, audit logging of every
              action, OTP-verified signatures on critical actions, and invite-only onboarding. No system is perfectly
              secure, but we work to protect your information and to limit access to those who need it to operate the
              Platform.
            </p>

            <h2 id="rights">
              <span className="n">10</span>Your rights
            </h2>
            <p>Subject to applicable law, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you;</li>
              <li>Request correction of inaccurate or incomplete data;</li>
              <li>Request deletion of your data, subject to our record-keeping obligations;</li>
              <li>Object to or restrict certain processing;</li>
              <li>Withdraw consent where processing is based on consent;</li>
              <li>Lodge a complaint with the Office of the Data Protection Commissioner.</li>
            </ul>
            <p>
              Because access is managed through your organisation, some requests may be directed to your
              organisation&apos;s administrator. To exercise your rights, contact us using the details in section 12.
            </p>

            <h2 id="cookies">
              <span className="n">11</span>Cookies and website data
            </h2>
            <p>
              This website uses essential cookies and similar technologies to function and to understand basic usage. We
              do not use third-party advertising cookies. You can control cookies through your browser settings;
              disabling essential cookies may affect how the site works.
            </p>

            <h2 id="contact">
              <span className="n">12</span>Contact us
            </h2>
            <p>For any questions about this Privacy Policy or to exercise your data-protection rights, contact:</p>
            <p>
              <strong>{BRAND.name}</strong>
              <br />
              Email: {BRAND.privacyEmail}
              <br />
              Nairobi, Kenya
            </p>
            <p>
              We may update this policy from time to time. Material changes will be notified through the Platform or by
              email, and the &quot;last updated&quot; date below will change.
            </p>

            <div className="updated">
              Last updated: 21 July 2026. This policy is provided for general information and does not constitute legal
              advice. IOU Exchange should have this document reviewed by a qualified Kenyan advocate before publication.
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
