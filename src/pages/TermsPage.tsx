import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './LegalPage.css'

export function TermsPage() {
  return (
    <div className="legal-screen">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={16} /> Back
        </Link>

        <header className="legal-header">
          <div className="legal-logo-mark" aria-hidden="true" />
          <p className="legal-label">Legal</p>
          <h1>Terms of Use</h1>
          <p className="legal-meta">Last updated: June 2026 &nbsp;·&nbsp; Effective: June 2026</p>
        </header>

        <div className="legal-body">
          <p>
            Please read these Terms of Use ("<strong>Terms</strong>") carefully before accessing or
            using modAI ("<strong>Service</strong>", "<strong>Platform</strong>"). By creating an
            account or accessing the Platform, you agree to be bound by these Terms. If you do not
            agree, do not use the Service.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 18 years old and have the legal authority to enter into a binding
            agreement on behalf of yourself or the organization you represent. By accepting these
            Terms you represent that you meet these requirements.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            modAI is a Retrieval-Augmented Generation (RAG) platform that enables organizations to
            upload internal documents, index their content, and query that knowledge through an AI
            chat interface. The Service runs on language models and vector search infrastructure
            operated by modAI or its sub-processors.
          </p>

          <h2>3. Account Registration & Security</h2>
          <ul>
            <li>You must provide accurate information when creating an account.</li>
            <li>
              You are responsible for maintaining the confidentiality of your credentials and for
              all activity that occurs under your account.
            </li>
            <li>
              You must notify us immediately at{' '}
              <a href="mailto:security@modai.app">security@modai.app</a> if you suspect unauthorized
              access.
            </li>
            <li>
              We reserve the right to suspend accounts that violate these Terms or that present a
              security risk.
            </li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Upload content that infringes intellectual property rights of third parties.</li>
            <li>
              Use the Service to generate or distribute illegal, harmful, defamatory, or harassing
              content.
            </li>
            <li>Attempt to reverse-engineer, decompile, or extract model weights or embeddings.</li>
            <li>
              Conduct automated attacks (e.g., credential stuffing, denial-of-service) against the
              Platform.
            </li>
            <li>Share account credentials with unauthorized third parties.</li>
            <li>
              Use the Service to process data that you do not have authorization to upload and
              analyze.
            </li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            <strong>Your content.</strong> You retain all ownership rights in documents you upload
            ("<strong>Customer Data</strong>"). You grant modAI a limited, non-exclusive licence to
            process Customer Data solely to provide and improve the Service.
          </p>
          <p>
            <strong>Our platform.</strong> modAI and its licensors own all rights in the Service,
            including software, models, interfaces, and documentation. These Terms do not grant you
            any licence to modAI's intellectual property beyond what is necessary to use the Service.
          </p>

          <h2>6. Data Processing &amp; Privacy</h2>
          <p>
            Our collection and use of personal data is described in our{' '}
            <Link to="/privacy">Privacy Policy</Link>. By using the Service you consent to such
            processing. For organizations subject to GDPR, a Data Processing Agreement is available
            on request at <a href="mailto:legal@modai.app">legal@modai.app</a>.
          </p>

          <h2>7. AI Output Disclaimer</h2>
          <p>
            AI-generated responses are provided for informational purposes only. modAI makes no
            warranty that outputs are accurate, complete, or up to date. You are solely responsible
            for evaluating and acting on any AI-generated content. Do not rely on the Service as a
            substitute for professional legal, medical, financial, or other expert advice.
          </p>

          <h2>8. Service Availability</h2>
          <p>
            We strive for high availability but do not guarantee uninterrupted access. We may
            perform maintenance, updates, or suspend the Service temporarily without notice. We
            shall not be liable for any losses arising from Service downtime.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, modAI's aggregate liability for any claims
            arising out of or relating to these Terms or the Service shall not exceed the greater of
            (a) the fees you paid in the 12 months preceding the claim or (b) USD $100. modAI shall
            not be liable for indirect, incidental, special, consequential, or punitive damages.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless modAI and its officers, directors,
            employees, and agents from any claims, damages, and expenses (including reasonable
            attorneys' fees) arising from your use of the Service or violation of these Terms.
          </p>

          <h2>11. Termination</h2>
          <p>
            Either party may terminate the agreement at any time. We may terminate or suspend your
            access immediately for material breach of these Terms. Upon termination, your right to
            use the Service ceases and we will delete Customer Data in accordance with our retention
            policy (see Privacy Policy).
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which modAI is incorporated,
            without regard to conflict-of-law principles. Any disputes shall be resolved by binding
            arbitration or in the competent courts of that jurisdiction.
          </p>

          <h2>13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will provide at least 14 days' notice
            of material changes via email or an in-app banner. Continued use after the effective
            date constitutes acceptance of the revised Terms.
          </p>

          <h2>14. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@modai.app">legal@modai.app</a>.
          </p>
        </div>

        <footer className="legal-footer">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/cookies">Cookie Policy</Link>
          <Link to="/">Back to App</Link>
        </footer>
      </div>
    </div>
  )
}
