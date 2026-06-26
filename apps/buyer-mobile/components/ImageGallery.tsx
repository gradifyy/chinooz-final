import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import type { ProductImage } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_SIZE = SCREEN_WIDTH
const THUMB_SIZE = 56
const THUMB_GAP = 8

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.8 }

interface ImageGalleryProps {
  images: ProductImage[]
  onIndexChange?: (index: number) => void
}

export default function ImageGallery({ images, onIndexChange }: ImageGalleryProps) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  const handleMomentumEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / IMAGE_SIZE)
    setActiveIndex(idx)
    onIndexChange?.(idx)
  }, [onIndexChange])

  const scrollToIndex = useCallback((idx: number) => {
    flatListRef.current?.scrollToOffset({ offset: idx * IMAGE_SIZE, animated: true })
    setActiveIndex(idx)
    onIndexChange?.(idx)
  }, [onIndexChange])

  if (!images.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 48 }}>📦</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Main pager */}
      <View style={styles.pagerWrap}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyExtractor={(_, i) => i.toString()}
          getItemLayout={(_, index) => ({
            length: IMAGE_SIZE,
            offset: IMAGE_SIZE * index,
            index,
          })}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews
          renderItem={({ item, index }) => (
            <GalleryImage
              uri={item.uri}
              alt={item.alt}
              index={index}
              total={images.length}
              isActive={index === activeIndex}
            />
          )}
        />

        {/* Page counter */}
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {t('product.imageCount', { current: activeIndex + 1, total: images.length })}
            </Text>
          </View>
        )}
      </View>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbList}
          keyExtractor={(_, i) => `thumb-${i}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => scrollToIndex(index)}
              activeOpacity={0.85}
              style={[
                styles.thumb,
                index === activeIndex && styles.thumbActive,
              ]}
            >
              <View style={styles.thumbImage}>
                <Text style={{ fontSize: 16 }}>📦</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

function GalleryImage({
  uri,
  alt,
  index,
  total,
  isActive,
}: {
  uri: string
  alt?: string
  index: number
  total: number
  isActive: boolean
}) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.5) {
        scale.value = withSpring(1, SPRING_CONFIG)
        translateX.value = withSpring(0, SPRING_CONFIG)
        translateY.value = withSpring(0, SPRING_CONFIG)
        savedScale.value = 1
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else {
        scale.value = withSpring(2, SPRING_CONFIG)
        savedScale.value = 2
      }
    })

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(3, savedScale.value * e.scale))
    })
    .onEnd(() => {
      if (scale.value < 1.2) {
        scale.value = withSpring(1, SPRING_CONFIG)
        translateX.value = withSpring(0, SPRING_CONFIG)
        translateY.value = withSpring(0, SPRING_CONFIG)
        savedScale.value = 1
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else {
        savedScale.value = scale.value
      }
    })

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX
        translateY.value = savedTranslateY.value + e.translationY
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })

  const composed = Gesture.Simultaneous(doubleTap, pinch, pan)

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <View style={styles.imageContainer} accessibilityLabel={`Image ${index + 1} of ${total}`}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.imageInner, animStyle]}>
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 64 }}>📦</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  emptyContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerWrap: {
    position: 'relative',
  },
  counter: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  counterText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    overflow: 'hidden',
  },
  imageInner: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.shimmer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbList: {
    gap: THUMB_GAP,
    paddingHorizontal: spacing[4],
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbActive: {
    borderColor: colors.primary,
  },
  thumbImage: {
    flex: 1,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
