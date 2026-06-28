/**
 * RH6 — Rider Help Center / FAQ mock data.
 *
 * Surfaces:
 * - RIDER_HELP_CATEGORIES:  ordered category list with i18n label keys + icons.
 * - RIDER_HELP_ARTICLES:  categorized, searchable articles. Each article has
 *   an id, category, related article ids, and optional context-relevance tags
 *   used to surface the most relevant articles first for the rider's situation.
 * - getRiderHelpContext():  derives a context snapshot from profile + active
 *   delivery so the help center can rank articles by relevance.
 * - getRelevantHelpArticles():  returns the top articles for a context, in order.
 *
 * Article copy lives in i18n (rider.support.help.article.<id>.{title|body}) so
 * the data table stays clean and localization is first-class.
 */

export type RiderHelpCategory =
  | 'gettingStarted'
  | 'deliveries'
  | 'earnings'
  | 'cod'
  | 'account'
  | 'safety'

/** Context tags that mark an article as relevant to a rider's situation. */
export type RiderHelpContextTag =
  | 'pendingVerification'
  | 'hasActiveDelivery'
  | 'hasCod'
  | 'newRider'
  | 'lowRating'

export interface RiderHelpArticle {
  id: string
  category: RiderHelpCategory
  /** Ids of related articles, shown in the article view. */
  related: string[]
  /** When any tag matches the rider's context, the article is surfaced first. */
  contextTags?: RiderHelpContextTag[]
}

export interface RiderHelpCategoryMeta {
  key: RiderHelpCategory
  /** i18n key for the category label. */
  labelKey: string
  /** lucide icon name resolved in the component. */
  icon: string
}

export const RIDER_HELP_CATEGORIES: RiderHelpCategoryMeta[] = [
  { key: 'gettingStarted', labelKey: 'rider.support.help.catGettingStarted', icon: 'rocket' },
  { key: 'deliveries', labelKey: 'rider.support.help.catDeliveries', icon: 'package' },
  { key: 'earnings', labelKey: 'rider.support.help.catEarnings', icon: 'wallet' },
  { key: 'cod', labelKey: 'rider.support.help.catCod', icon: 'banknote' },
  { key: 'account', labelKey: 'rider.support.help.catAccount', icon: 'user-cog' },
  { key: 'safety', labelKey: 'rider.support.help.catSafety', icon: 'shield' },
]

export const RIDER_HELP_ARTICLES: RiderHelpArticle[] = [
  // Getting started
  { id: 'gs1', category: 'gettingStarted', related: ['gs2', 'del1', 'earn1'], contextTags: ['newRider'] },
  { id: 'gs2', category: 'gettingStarted', related: ['gs1', 'acc1', 'del1'], contextTags: ['newRider'] },
  { id: 'gs3', category: 'gettingStarted', related: ['gs1', 'del2', 'safe1'] },
  // Deliveries
  { id: 'del1', category: 'deliveries', related: ['del2', 'del3', 'gs1'], contextTags: ['hasActiveDelivery'] },
  { id: 'del2', category: 'deliveries', related: ['del1', 'safe1', 'cod1'], contextTags: ['hasActiveDelivery'] },
  { id: 'del3', category: 'deliveries', related: ['del1', 'del2', 'earn2'] },
  // Earnings & payouts
  { id: 'earn1', category: 'earnings', related: ['earn2', 'earn3', 'cod2'] },
  { id: 'earn2', category: 'earnings', related: ['earn1', 'earn3', 'cod1'] },
  { id: 'earn3', category: 'earnings', related: ['earn1', 'earn2', 'acc2'] },
  // COD & cash
  { id: 'cod1', category: 'cod', related: ['cod2', 'del2', 'earn1'], contextTags: ['hasCod'] },
  { id: 'cod2', category: 'cod', related: ['cod1', 'earn1', 'del3'], contextTags: ['hasCod'] },
  { id: 'cod3', category: 'cod', related: ['cod1', 'cod2', 'safe2'], contextTags: ['hasCod'] },
  // Account & docs
  { id: 'acc1', category: 'account', related: ['acc2', 'acc3', 'gs1'], contextTags: ['pendingVerification'] },
  { id: 'acc2', category: 'account', related: ['acc1', 'acc3', 'earn3'], contextTags: ['pendingVerification'] },
  { id: 'acc3', category: 'account', related: ['acc1', 'acc2', 'safe1'] },
  // Safety
  { id: 'safe1', category: 'safety', related: ['safe2', 'safe3', 'del2'], contextTags: ['hasActiveDelivery'] },
  { id: 'safe2', category: 'safety', related: ['safe1', 'safe3', 'cod3'] },
  { id: 'safe3', category: 'safety', related: ['safe1', 'safe2', 'acc3'] },
]

/** A snapshot of the rider's situation used to rank help articles. */
export interface RiderHelpContext {
  tags: RiderHelpContextTag[]
}

/**
 * Derive a help-context snapshot from rider profile + active delivery state.
 * Pass the verification status and whether a delivery / COD is active.
 */
export function getRiderHelpContext(opts: {
  verification?: 'verified' | 'pending' | 'rejected'
  hasActiveDelivery?: boolean
  hasCod?: boolean
  rating?: number
}): RiderHelpContext {
  const tags: RiderHelpContextTag[] = ['newRider']
  if (opts.verification === 'pending' || opts.verification === 'rejected') {
    tags.push('pendingVerification')
  }
  if (opts.hasActiveDelivery) tags.push('hasActiveDelivery')
  if (opts.hasCod) tags.push('hasCod')
  if (typeof opts.rating === 'number' && opts.rating < 4.0) tags.push('lowRating')
  return { tags }
}

/**
 * Return articles whose context tags intersect the rider's context, ranked by
 * the number of matching tags (most relevant first). Falls back to an empty
 * list when nothing matches so the UI can hide the "relevant for you" section.
 */
export function getRelevantHelpArticles(ctx: RiderHelpContext): RiderHelpArticle[] {
  if (ctx.tags.length === 0) return []
  const scored = RIDER_HELP_ARTICLES.map((a) => {
    const matches = (a.contextTags ?? []).filter((tag) => ctx.tags.includes(tag)).length
    return { a, matches }
  }).filter((x) => x.matches > 0)
  scored.sort((a, b) => b.matches - a.matches)
  return scored.slice(0, 4).map((x) => x.a)
}

/** Look up a single article by id. */
export function getRiderHelpArticle(id: string): RiderHelpArticle | undefined {
  return RIDER_HELP_ARTICLES.find((a) => a.id === id)
}

/** Resolve related articles for a given article id, preserving order. */
export function getRelatedHelpArticles(id: string): RiderHelpArticle[] {
  const article = getRiderHelpArticle(id)
  if (!article) return []
  return article.related
    .map((rid) => getRiderHelpArticle(rid))
    .filter((a): a is RiderHelpArticle => !!a)
}

/** All articles in a given category, in declared order. */
export function getHelpArticlesByCategory(category: RiderHelpCategory): RiderHelpArticle[] {
  return RIDER_HELP_ARTICLES.filter((a) => a.category === category)
}
