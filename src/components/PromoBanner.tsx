import { PROMO } from '../config/promo'

type PromoBannerProps = {
  /** compact = toolbar strip; hero = empty-state card */
  variant?: 'strip' | 'hero'
}

export function PromoBanner({ variant = 'strip' }: PromoBannerProps) {
  if (variant === 'hero') {
    return (
      <a
        className="promo-hero"
        href={PROMO.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${PROMO.brand}：${PROMO.headline}`}
      >
        <span className="promo-kicker">合作推荐 · {PROMO.brand}</span>
        <span className="promo-hero-title">{PROMO.headline}</span>
        <span className="promo-hero-body">{PROMO.body}</span>
        <span className="promo-cta">{PROMO.cta}</span>
      </a>
    )
  }

  return (
    <aside className="promo-strip" aria-label="合作推荐">
      <a
        className="promo-strip-link"
        href={PROMO.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        <span className="promo-strip-brand">{PROMO.brand}</span>
        <span className="promo-strip-text">
          <strong>{PROMO.headline}</strong>
          <span className="promo-strip-sub">{PROMO.body}</span>
        </span>
        <span className="promo-strip-cta">{PROMO.cta}</span>
      </a>
    </aside>
  )
}
