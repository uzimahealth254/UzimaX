import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { BRAND } from '@/lib/brand';

const TOC = [
  { id: 'agree', label: 'Agreement to terms' },
  { id: 'nature', label: 'What IOU Exchange is — and is not' },
  { id: 'accounts', label: 'Eligibility and accounts' },
  { id: 'roles', label: 'Roles and responsibilities' },
  { id: 'signatories', label: 'Authorised signatories' },
  { id: 'fees', label: 'Fees' },
  { id: 'acceptable', label: 'Acceptable use' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'data', label: 'Data protection' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'indemnity', label: 'Indemnity' },
  { id: 'termination', label: 'Suspension and termination' },
  { id: 'law', label: 'Governing law and disputes' },
  { id: 'changes', label: 'Changes and contact' },
];

export default function TermsPage() {
  useHashScroll();

  return (
    <MarketingLayout>
      <section className="legal-hero">
        <div className="container">
          <div className="legal-wrap">
            <span className="label">Legal</span>
            <h1>Terms of Service</h1>
            <div className="meta">The terms governing use of the IOU Exchange platform.</div>
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

            <h2 id="agree">
              <span className="n">01</span>Agreement to terms
            </h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern access to and use of the IOU Exchange platform and this website
              (together, the &quot;Platform&quot;), operated by <strong>UzimaX</strong> (&quot;UzimaX&quot;, &quot;we&quot;,
              &quot;us&quot;). The product brand is <strong>IOU Exchange</strong>. By accessing or using the Platform, you agree to these Terms on behalf of yourself and the
              organisation you represent. If you do not agree, do not use the Platform.
            </p>

            <h2 id="nature">
              <span className="n">02</span>What IOU Exchange is — and is not
            </h2>
            <p>
              IOU Exchange is a technology platform that facilitates trade-receivables workflows for health-trade organisations:
              registering invoices and IOUs, confirming receivables between counterparties, assigning receivables to a
              special-purpose vehicle (SPV), and providing settlement visibility.
            </p>
            <div className="legal-callout">
              <p>
                <strong>IOU Exchange is not a bank, lender, financial institution, or payment service provider.</strong> IOU Exchange
                does not itself hold or move funds. Any disbursement or collection of money is performed by licensed
                settlement partners, not by IOU Exchange. Nothing on the Platform is an offer of finance, investment advice, or
                a solicitation to buy or sell securities.
              </p>
            </div>
            <p>
              The Platform provides workflow orchestration and record-keeping. The commercial and legal validity of any
              receivable, assignment, or transaction is the responsibility of the participating organisations and their
              advisers.
            </p>

            <h2 id="accounts">
              <span className="n">03</span>Eligibility and accounts
            </h2>
            <p>
              The Platform is invite-only and available to onboarded organisations and their authorised users. You must
              be authorised by your organisation to use the Platform and to take actions on its behalf. You are
              responsible for keeping your login credentials confidential and for all activity under your account. Notify
              us immediately of any unauthorised use.
            </p>

            <h2 id="roles">
              <span className="n">04</span>Roles and responsibilities
            </h2>
            <p>Each participant is responsible for the accuracy and legitimacy of the information it submits:</p>
            <ul>
              <li>
                <strong>Buyers</strong> are responsible for confirming that invoices they post or verify represent
                genuine, approved, and undisputed obligations.
              </li>
              <li>
                <strong>Suppliers</strong> are responsible for the accuracy of invoices they list and for their authority
                to assign the underlying receivables.
              </li>
              <li>
                <strong>SPVs</strong> are responsible for their own purchase decisions and pricing.
              </li>
            </ul>
            <p>
              IOU Exchange does not verify the underlying commercial reality of any transaction and is not a party to the
              agreements between participants.
            </p>

            <h2 id="signatories">
              <span className="n">05</span>Authorised signatories
            </h2>
            <p>
              Certain actions require an authorised signatory to confirm identity via one-time-password (OTP)
              verification before a digital signature is applied. Your organisation is responsible for designating
              signatories, keeping that list current, and ensuring that only authorised individuals sign. Actions taken
              by a verified signatory are binding on the organisation.
            </p>

            <h2 id="fees">
              <span className="n">06</span>Fees
            </h2>
            <p>
              Fees for use of the Platform, and any commissions applied to transactions, are as agreed between IOU Exchange and
              your organisation. Where fees apply to a transaction, they are calculated and recorded on the Platform.
              Settlement of fees is handled in accordance with your organisation&apos;s agreement with IOU Exchange.
            </p>

            <h2 id="acceptable">
              <span className="n">07</span>Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul>
              <li>Submit false, misleading, or fraudulent information;</li>
              <li>Post invoices or receivables you are not authorised to submit;</li>
              <li>Attempt to gain unauthorised access to any part of the Platform or another organisation&apos;s data;</li>
              <li>Interfere with the security, integrity, or performance of the Platform;</li>
              <li>Use the Platform for any unlawful purpose or in breach of applicable law.</li>
            </ul>
            <p>We may suspend or terminate access for any breach of these Terms.</p>

            <h2 id="ip">
              <span className="n">08</span>Intellectual property
            </h2>
            <p>
              The Platform, including its software, design, and content, is owned by IOU Exchange and protected by
              intellectual-property laws. These Terms grant you a limited, non-exclusive, non-transferable right to use
              the Platform for its intended purpose. You may not copy, modify, reverse-engineer, or create derivative
              works from the Platform without our written consent.
            </p>

            <h2 id="data">
              <span className="n">09</span>Data protection
            </h2>
            <p>
              Our collection and use of personal data is described in our{' '}
              <Link to="/privacy" className="inline-legal">
                Privacy Policy
              </Link>
              , which forms part of these Terms. Each organisation is responsible for ensuring it has the necessary
              authority to share the personal data of its users and representatives with the Platform.
            </p>

            <h2 id="disclaimers">
              <span className="n">10</span>Disclaimers
            </h2>
            <p>
              The Platform is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent permitted by
              law, IOU Exchange disclaims all warranties, express or implied, including fitness for a particular purpose and
              non-infringement. We do not warrant that the Platform will be uninterrupted, error-free, or that any
              transaction will complete successfully.
            </p>
            <p>
              IOU Exchange does not guarantee the creditworthiness of any buyer, the collectability of any receivable, or the
              outcome of any transaction. Participants act on their own commercial judgment.
            </p>

            <h2 id="liability">
              <span className="n">11</span>Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, IOU Exchange shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or for any loss of profits, revenue, data, or business, arising out of
              or related to your use of the Platform. Our total aggregate liability arising from these Terms shall not
              exceed the fees paid by your organisation to IOU Exchange in the twelve months preceding the event giving rise to
              the claim.
            </p>

            <h2 id="indemnity">
              <span className="n">12</span>Indemnity
            </h2>
            <p>
              You agree to indemnify and hold harmless IOU Exchange from any claims, losses, or liabilities arising from your
              breach of these Terms, your submission of inaccurate or unauthorised information, or your violation of any
              law or third-party right in connection with your use of the Platform.
            </p>

            <h2 id="termination">
              <span className="n">13</span>Suspension and termination
            </h2>
            <p>
              We may suspend or terminate access to the Platform, in whole or in part, where required by law, to protect
              the security or integrity of the Platform, or in accordance with your organisation&apos;s agreement with
              IOU Exchange. Provisions that by their nature should survive termination — including intellectual property,
              disclaimers, limitation of liability, indemnity, and governing law — will survive.
            </p>

            <h2 id="law">
              <span className="n">14</span>Governing law and disputes
            </h2>
            <p>
              These Terms are governed by the laws of Kenya. Any dispute arising from these Terms or the Platform shall
              be subject to the exclusive jurisdiction of the courts of Kenya, or resolved by arbitration in Nairobi
              where the parties so agree.
            </p>

            <h2 id="changes">
              <span className="n">15</span>Changes and contact
            </h2>
            <p>
              We may update these Terms from time to time. Material changes will be notified through the Platform or by
              email, and continued use after changes take effect constitutes acceptance. Questions about these Terms can
              be sent to {BRAND.legalEmail}.
            </p>
            <p>
              <strong>{BRAND.name}</strong>
              <br />
              Nairobi, Kenya
            </p>

            <div className="updated">
              Last updated: 21 July 2026. These Terms are provided for general information and do not constitute legal
              advice. IOU Exchange should have this document reviewed by a qualified Kenyan advocate before publication.
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
