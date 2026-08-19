import type { AlbumRecommendationResult } from '../types'

interface Props {
  result: AlbumRecommendationResult | null
  loading: boolean
  providerLabel: string
  onClose: () => void
  onRegenerate: () => void
}

export function AlbumRecommendations({
  result,
  loading,
  providerLabel,
  onClose,
  onRegenerate,
}: Props) {
  const albums = Array.isArray(result?.albums) ? result.albums : []

  return (
    <section
      className="album-recommendations"
      aria-labelledby="album-recommendations-title"
      aria-busy={loading}
    >
      <header className="album-recommendations-header">
        <div>
          <span className="album-recommendations-kicker">Work soundtrack</span>
          <h2 id="album-recommendations-title">Albums for this list</h2>
        </div>
        <button
          className="album-recommendations-close"
          onClick={onClose}
          aria-label="Close album recommendations"
          title="Close"
        >
          ×
        </button>
      </header>

      <div className="album-recommendations-body" aria-live="polite">
        {loading ? (
          <div className="album-loading-list" aria-label="Finding album recommendations">
            {[0, 1, 2, 3].map(index => (
              <div className="album-loading-row" key={index} aria-hidden="true">
                <span className="album-loading-disc" />
                <span className="album-loading-lines">
                  <span />
                  <span />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {result?.summary && <p className="album-recommendations-summary">{result.summary}</p>}
            <ol className="album-list">
              {albums.map((album, index) => (
                <li className="album-row" key={`${album.artist}-${album.title}-${index}`}>
                  <span className="album-disc" aria-hidden="true"><span /></span>
                  <div className="album-copy">
                    <div className="album-title-line">
                      <strong>{album.title}</strong>
                      <span>{album.artist}{album.year ? ` · ${album.year}` : ''}</span>
                    </div>
                    <p>{album.fit}</p>
                  </div>
                  <span className="album-best-for">{album.bestFor}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <footer className="album-recommendations-footer">
        <span>{providerLabel} · Current tasks</span>
        <button onClick={onRegenerate} disabled={loading}>Regenerate</button>
      </footer>
    </section>
  )
}
