import { ui } from '../interfaceLocale'
import type { AlbumRecommendationResult } from '../types'

interface Props {
  result: AlbumRecommendationResult | null
  loading: boolean
  error?: string | null
  providerLabel: string
  onClose: () => void
  onRegenerate?: () => void
}

export function AlbumRecommendations({
  result,
  loading,
  error,
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
        <h2 id="album-recommendations-title">{ui("Albums for working")}</h2>
        <button
          className="album-recommendations-close"
          onClick={onClose}
          aria-label={ui("Close album recommendations")}
          title={ui("Close")}
        >
          ×
        </button>
      </header>

      <div className="album-recommendations-body" aria-live="polite">
        {loading ? (
          <div className="album-loading-list" aria-label={ui("Finding album recommendations")}>
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
            {error && (
              <p className="album-recommendations-error">
                <strong>{ui("Could not find albums")}</strong><br />
                {error}
              </p>
            )}
            <ol className="album-list">
              {albums.map((album, index) => (
                <li className="album-row" key={`${album.artist}-${album.title}-${index}`}>
                  <span className="album-disc" aria-hidden="true"><span /></span>
                  <div className="album-copy">
                    <div className="album-title-line">
                      <strong>{album.title}</strong>
                      <span>{album.artist}{typeof album.year === 'number' ? ` · ${album.year}` : ''}</span>
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
        <span>{ui("{0} · Current tasks", [providerLabel])}</span>
        <button onClick={onRegenerate} disabled={loading || !onRegenerate}>{ui("Regenerate")}</button>
      </footer>
    </section>
  )
}
