'use client'

import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateShort } from '@chinooz/utils'
import { useProductQuestions, useAskProductQuestion } from '@chinooz/hooks'
import type { ProductQuestion } from '@chinooz/types'

function QuestionRow({ question }: { question: ProductQuestion }) {
  const { t } = useTranslation()
  return (
    <div className="py-4 border-b border-border-light last:border-b-0">
      <div className="flex gap-2">
        <span className="text-xs font-bold text-primary shrink-0 mt-0.5">Q</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{question.body}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {question.author} · {formatDateShort(question.createdAt)}
          </p>
        </div>
      </div>

      {question.answers.length > 0 ? (
        question.answers.map(answer => (
          <div key={answer.id} className="flex gap-2 mt-3 ml-1">
            <span className="text-xs font-bold text-success shrink-0 mt-0.5">A</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text">{answer.body}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {answer.isSeller ? (
                  <span className="inline-flex items-center gap-0.5 bg-success-light text-success font-semibold px-1.5 py-0.5 rounded-full mr-1">
                    {t('product.qa.sellerBadge')}
                  </span>
                ) : (
                  <>{answer.author} · </>
                )}
                {formatDateShort(answer.createdAt)}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-xs text-text-muted mt-2 ml-5">{t('product.qa.noAnswerYet')}</p>
      )}
    </div>
  )
}

export default function ProductQA({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const { data: questions, isLoading } = useProductQuestions(productId)
  const askQuestion = useAskProductQuestion()
  const [body, setBody] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    await askQuestion.mutateAsync({ productId, body: trimmed })
    setBody('')
  }, [body, productId, askQuestion])

  return (
    <section aria-label={t('product.qa.title')}>
      <h2 className="text-lg font-semibold text-text mb-1">{t('product.qa.title')}</h2>
      <p className="text-sm text-text-muted mb-4">{t('product.qa.subtitle')}</p>

      {/* Ask form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('product.qa.placeholder')}
          maxLength={300}
          className="flex-1 h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-text"
          aria-label={t('product.qa.placeholder')}
        />
        <button
          type="submit"
          disabled={!body.trim() || askQuestion.isPending}
          className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          {askQuestion.isPending ? t('common.loading') : t('product.qa.ask')}
        </button>
      </form>

      {askQuestion.isSuccess && (
        <p className="text-xs text-success font-medium mb-3">✓ {t('product.qa.submitted')}</p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4">
          {questions.map(q => (
            <QuestionRow key={q.id} question={q} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted py-4">{t('product.qa.empty')}</p>
      )}
    </section>
  )
}
