import React, { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatDateShort } from '@chinooz/utils'
import { spacing, radii, fontSz } from '@chinooz/theme'
import { useAppTheme } from './ThemeProvider'
import Icon from './Icon'
import { useProductQuestions, useAskProductQuestion } from '@chinooz/hooks'
import type { ProductQuestion } from '@chinooz/types'

function QuestionRow({ question, isLast }: { question: ProductQuestion; isLast: boolean }) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  return (
    <View
      style={{
        paddingVertical: spacing[3],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '700', color: colors.primary, marginTop: 1 }}>Q</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '500', color: colors.text }}>{question.body}</Text>
          <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted, marginTop: 2 }}>
            {question.author} · {formatDateShort(question.createdAt)}
          </Text>
        </View>
      </View>

      {question.answers.length > 0 ? (
        question.answers.map(answer => (
          <View key={answer.id} style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2], marginLeft: spacing[1] }}>
            <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '700', color: colors.success, marginTop: 1 }}>A</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSz('sm')[0], color: colors.text }}>{answer.body}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2, flexWrap: 'wrap' }}>
                {answer.isSeller ? (
                  <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.full }}>
                    <Text style={{ fontSize: fontSz('xs')[0], fontWeight: '600', color: colors.success }}>{t('product.qa.sellerBadge')}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted }}>{answer.author}</Text>
                )}
                <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted }}>{formatDateShort(answer.createdAt)}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted, marginTop: spacing[2], marginLeft: spacing[5] }}>
          {t('product.qa.noAnswerYet')}
        </Text>
      )}
    </View>
  )
}

export default function ProductQA({ productId }: { productId: string }) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const { data: questions, isLoading } = useProductQuestions(productId)
  const askQuestion = useAskProductQuestion()
  const [body, setBody] = useState('')

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim()
    if (!trimmed) return
    await askQuestion.mutateAsync({ productId, body: trimmed })
    setBody('')
  }, [body, productId, askQuestion])

  const canSubmit = !!body.trim() && !askQuestion.isPending

  return (
    <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[3] }}>
      <View>
        <Text style={{ fontSize: fontSz('lg')[0], fontWeight: '600', color: colors.text }}>{t('product.qa.title')}</Text>
        <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted, marginTop: 2 }}>{t('product.qa.subtitle')}</Text>
      </View>

      {/* Ask form */}
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('product.qa.placeholder')}
          placeholderTextColor={colors.textTertiary}
          maxLength={300}
          style={{
            flex: 1,
            height: 44,
            backgroundColor: colors.background,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing[3],
            fontSize: fontSz('sm')[0],
            color: colors.text,
          }}
          accessibilityLabel={t('product.qa.placeholder')}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            paddingHorizontal: spacing[4],
            height: 44,
            borderRadius: radii.md,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canSubmit ? 1 : 0.4,
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('product.qa.ask')}
        >
          <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.white }}>
            {askQuestion.isPending ? t('common.loading') : t('product.qa.ask')}
          </Text>
        </TouchableOpacity>
      </View>

      {askQuestion.isSuccess && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="checkmark" size={12} color={colors.success} /><Text style={{ fontSize: fontSz('xs')[0], fontWeight: '500', color: colors.success }}>{t('product.qa.submitted')}</Text></View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={{ gap: spacing[2] }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={{ height: 48, borderRadius: radii.md, backgroundColor: colors.border }} />
          ))}
        </View>
      ) : questions && questions.length > 0 ? (
        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing[3],
          }}
        >
          {questions.map((q, i) => (
            <QuestionRow key={q.id} question={q} isLast={i === questions.length - 1} />
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted, paddingVertical: spacing[2] }}>{t('product.qa.empty')}</Text>
      )}
    </View>
  )
}
