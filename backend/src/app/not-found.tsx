import type { Metadata } from 'next'

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          height: '100vh',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          color: '#111',
        }}
      >
        <div style={{ maxWidth: 680, padding: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650 }}>404</h1>
          <p style={{ marginTop: 8, lineHeight: 1.5, color: '#333' }}>
            This backend only serves <code>/api/*</code> routes.
            <br />
            Frontend routes like <code>/dashboard</code> are handled by the React SPA.
          </p>
          <p style={{ marginTop: 16, lineHeight: 1.5, color: '#333' }}>
            If you are trying to open the app in a browser, use the frontend entry URL (Vite dev server or
            your deployed frontend base URL).
          </p>
        </div>
      </body>
    </html>
  )
}
