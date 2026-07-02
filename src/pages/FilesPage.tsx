import { useEffect, useState } from 'react'
import { getFiles } from '../lib/api'
import './pages.css'

const kb = (size: number) => `${Math.max(1, Math.round(size / 1024))} KB`

export function FilesPage() {
  const [files, setFiles] = useState<
    Array<{ id: string; filename: string; size_bytes: number; status: string; created_at: string }>
  >([])

  useEffect(() => {
    void (async () => {
      try {
        const response = await getFiles()
        setFiles(response.files)
      } catch {
        setFiles([])
      }
    })()
  }, [])

  return (
    <div className="list-page">
      <header className="page-head">
        <div>
          <h2>Uploaded Documents</h2>
          <p className="muted">Knowledge files available for AI assistance.</p>
        </div>
      </header>

      <section className="list-wrap glass-card">
        {!files.length && <p className="muted">No files uploaded yet.</p>}
        {files.map((file) => (
          <article className="list-item" key={file.id}>
            <h3>{file.filename}</h3>
            <p className="muted">
              {kb(file.size_bytes)} • {file.status} • {new Date(file.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}
