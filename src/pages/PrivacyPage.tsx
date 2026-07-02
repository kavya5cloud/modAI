import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './LegalPage.css'

export function PrivacyPage() {
  return (
    <div className="legal-screen">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={16} /> Back
        </Link>

        <header className="legal-header">
          <div className="legal-logo-mark" aria-hidden="true" />
          <p className="legal-label">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="legal-meta">Last updated: June 2026 &nbsp;·&nbsp; Effective: June 2026</p>
        </header>

        <div className="legal-body">
          <p>
            modAI ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") is
            committed to protecting your personal data. This Privacy Policy explains what data we
            collect, how we use it, and your rights under applicable privacy laws including the
            General Data Protection Regulation (GDPR) and the California Consumer Privacy Act
            (CCPA).
          </p>

          <h2>1. Data We Collect</h2>
          <h3>Account &amp; Identity Data</h3>
          <ul>
            <li>Email address (used as login identifier)</li>
            <li>Company name and profile information</li>
            <li>Hashed password (never stored or transmitted in plain text)</li>
          </ul>

          <h3>Usage &amp; Content Data</h3>
          <ul>
            <li>Documents you upload (PDFs, DOCX, TXT files)</li>
            <li>Extracted text and vector embeddings derived from your documents</li>
            <li>Chat conversation history and AI-generated responses</li>
            <li>Session metadata (timestamps, IP address, user-agent)</li>
          </ul>

          <h3>Technical Data</h3>
          <ul>
            <li>Server-side request logs (route, method, anonymised IP, status code)</li>
            <li>Error logs (no personal data in error payloads)</li>
          </ul>

          <p>We do <strong>not</strong> use tracking pixels, third-party analytics SDKs, or advertising networks.</p>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li><strong>Service delivery:</strong> authenticate users, store and retrieve documents, generate AI responses.</li>
            <li><strong>Security:</strong> detect abuse, investigate incidents, enforce rate limits.</li>
            <li><strong>Product improvement:</strong> aggregate, anonymised usage metrics to improve AI quality.</li>
            <li><strong>Legal compliance:</strong> comply with applicable laws and respond to lawful requests.</li>
          </ul>
          <p>We do not sell, rent, or trade your personal data to third parties.</p>

          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <ul>
            <li><strong>Contract performance:</strong> processing necessary to provide the Service you signed up for.</li>
            <li><strong>Legitimate interests:</strong> security monitoring, fraud prevention, service improvement.</li>
            <li><strong>Legal obligation:</strong> compliance with applicable law.</li>
          </ul>

          <h2>4. Data Sharing &amp; Sub-processors</h2>
          <p>We share data only with:</p>
          <ul>
            <li><strong>Neon (database):</strong> encrypted PostgreSQL storage for all application data.</li>
            <li><strong>Cloudflare R2 (optional):</strong> object storage for uploaded files when enabled.</li>
            <li><strong>Ollama (LLM inference):</strong> runs locally on your server; no data leaves your network.</li>
          </ul>
          <p>
            A full sub-processor list is available on request at{' '}
            <a href="mailto:privacy@modai.app">privacy@modai.app</a>.
          </p>

          <h2>5. Data Retention</h2>
          <ul>
            <li>Account data is retained for the life of your account plus 30 days after deletion.</li>
            <li>Uploaded documents and embeddings are deleted when you delete a document or close your account.</li>
            <li>Server logs are retained for 90 days for security purposes.</li>
          </ul>

          <h2>6. Data Security</h2>
          <p>We implement appropriate technical and organizational measures including:</p>
          <ul>
            <li>Passwords hashed with bcrypt (12 rounds)</li>
            <li>All data encrypted in transit (TLS 1.2+) and at rest</li>
            <li>JWT sessions with HttpOnly, SameSite=Lax cookies</li>
            <li>Strict Content-Security-Policy and security headers on all responses</li>
            <li>Rate limiting on all authenticated endpoints</li>
            <li>Parameterized SQL queries (no SQL injection risk)</li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> correct inaccurate data.</li>
            <li><strong>Erasure:</strong> request deletion of your data ("right to be forgotten").</li>
            <li><strong>Portability:</strong> receive your data in a machine-readable format.</li>
            <li><strong>Objection:</strong> object to processing based on legitimate interests.</li>
            <li><strong>Restriction:</strong> request that we limit processing in certain circumstances.</li>
          </ul>
          <p>
            To exercise any of these rights, email{' '}
            <a href="mailto:privacy@modai.app">privacy@modai.app</a>. We will respond within 30
            days (GDPR) or 45 days (CCPA).
          </p>

          <h2>8. California Residents (CCPA)</h2>
          <p>
            California residents have the right to know what personal information we collect and
            disclose, to delete personal information, and to opt-out of the sale of personal
            information. We do not sell personal information. To submit a CCPA request, contact{' '}
            <a href="mailto:privacy@modai.app">privacy@modai.app</a>.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Data may be processed in countries outside your own. Where required, we rely on
            Standard Contractual Clauses (SCCs) approved by the European Commission for transfers
            outside the EEA.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            The Service is not directed to individuals under 18 years of age. We do not knowingly
            collect personal data from minors. If we become aware of such collection, we will
            delete it promptly.
          </p>

          <h2>11. Cookies</h2>
          <p>
            We use a single session cookie for authentication. For full details, see our{' '}
            <Link to="/cookies">Cookie Policy</Link>.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy. We will notify you of material changes via email at
            least 14 days before they take effect. The "Last updated" date at the top of this page
            will always reflect the most recent revision.
          </p>

          <h2>13. Contact &amp; DPO</h2>
          <p>
            For privacy-related inquiries or to reach our Data Protection Officer, contact{' '}
            <a href="mailto:privacy@modai.app">privacy@modai.app</a>.
          </p>
        </div>

        <footer className="legal-footer">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/cookies">Cookie Policy</Link>
          <Link to="/">Back to App</Link>
        </footer>
      </div>
    </div>
  )
}
