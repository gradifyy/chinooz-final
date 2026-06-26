import React from 'react'
import { View, Image, StyleSheet, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')
const IMG_SIZE = Math.min(width * 0.6, 280)

interface Props {
  variant: 'shop' | 'delivery' | 'payment'
}

const images: Record<string, any> = {
  shop: require('../assets/images/onboarding-shop.png'),
  delivery: require('../assets/images/onboarding-delivery.png'),
  payment: require('../assets/images/onboarding-payment.png'),
}

export default function OnboardingIllustration({ variant }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={images[variant]}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={`${variant} illustration`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
})
