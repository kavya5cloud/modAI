import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './LegalPage.css'

export function CookiePage() {
  return (
    <div className="legal-screen">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={16} /> Back
        </Link>

        <header className="legal-header">
          <div className="legal-logo-mark" aria-hidden="true" />
          <p className="legal-label">Legal</p>
          <h1>Cookie Policy</h1>
          <p className="legal-meta">Last updated: June 2026 &nbsp;·&nbsp; Effective: June 2026</p>
        </header>

        <div className="legal-body">
          <p>
            This Cookie Policy explains how modAI uses cookies and similar storage technologies when
            you use our Platform. We believe in minimal, purposeful data collection — we use only
            the cookies strictly necessary to operate the Service.
          </p>

          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device by your browser when you visit a
            website. They allow services to remember your preferences, maintain your login session,
            and gather aggregate usage information.
          </p>

          <h2>2. Cookies We Use</h2>

          <div className="cookie-table-wrap">
            <table className="cookie-table">
              <thead>
                <tr>
                  <th>Cookie Name</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>next-auth.session-token</code></td>
                  <td>Strictly Necessary</td>
                  <td>30 days</td>
                  <td>
                    Stores your encrypted session JWT so you remain logged in. HttpOnly, SameSite=Lax.
                    Required for the Service to function.
                  </td>
                </tr>
                <tr>
                  <td><code>next-auth.csrf-token</code></td>
                  <td>Strictly Necessary</td>
                  <td>Session</td>
                  <td>
                    CSRF protection token used to validate form submissions to the authentication
                    endpoints. Deleted when you close your browser.
                  </td>
                </tr>
                <tr>
                  <td><code>next-auth.callback-url</code></td>
                  <td>Functional</td>
                  <td>Session</td>
                  <td>
                    Stores the URL you were trying to access before login so you can be redirected
                    there after authentication completes.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            We do <strong>not</strong> use advertising cookies, third-party tracking cookies, or
            analytics cookies (e.g., Google Analytics). We do not serve ads.
          </p>

          <h2>3. Local Storage</h2>
          <p>
            The frontend application stores a small amount of data in your browser's{' '}
            <code>localStorage</code> to cache your session email and company name. This data never
            leaves your device and is cleared when you log out.
          </p>

          <h2>4. Your Choices</h2>
          <p>
            Because we only use strictly necessary cookies, there is no consent banner — these
            cookies cannot be disabled without breaking the login functionality of the Service. If
            you wish to clear them, you can:
          </p>
          <ul>
            <li>Log out from within the app (clears the session cookie).</li>
            <li>Clear cookies for this site via your browser settings.</li>
            <li>
              Use your browser's incognito/private mode, which automatically deletes session
              cookies when the window is closed.
            </li>
          </ul>

          <h2>5. Third-Party Cookies</h2>
          <p>
            We do not embed third-party scripts, widgets, or iframes that would set cookies on
            your device. All cookies described above originate solely from the modAI domain.
          </p>

          <h2>6. Changes to This Policy</h2>
          <p>
            If we introduce new cookies (e.g., for optional analytics), we will update this policy
            and seek your consent where required by applicable law.
          </p>

          <h2>7. Contact</h2>
          <p>
            For questions about our use of cookies, email{' '}
            <a href="mailto:privacy@modai.app">privacy@modai.app</a>.
          </p>
        </div>

        <footer className="legal-footer">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/">Back to App</Link>
        </footer>
      </div>
    </div>
  )
}
