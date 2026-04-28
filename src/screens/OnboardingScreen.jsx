import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🍛',
    title: 'Share Your Meals',
    description:
      'Cook once, share with fellow students. Upload your home-cooked meals and let your campus community enjoy them.',
    gradient: ['#FF6B35', '#FF8C42'],
  },
  {
    id: '2',
    emoji: '💰',
    title: 'Split the Cost',
    description:
      'Affordable meals for everyone. Split cooking costs fairly and save money on nutritious home-cooked food.',
    gradient: ['#4CAF50', '#66BB6A'],
  },
  {
    id: '3',
    emoji: '🤖',
    title: 'AI-Powered Recommendations',
    description:
      'Get personalised meal suggestions based on your preferences, schedule, and dietary needs.',
    gradient: ['#2196F3', '#42A5F5'],
  },
  {
    id: '4',
    emoji: '🌟',
    title: 'Build Community',
    description:
      'Connect with fellow students through food. Share meals, earn trust, and make campus life better.',
    gradient: ['#9C27B0', '#AB47BC'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  const renderSlide = ({ item }) => (
    <LinearGradient colors={item.gradient} style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </LinearGradient>
  );

  const Dot = ({ index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];
    const dotWidth = scrollX.interpolate({
      inputRange,
      outputRange: [8, 24, 8],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.dot, { width: dotWidth, opacity }]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <Dot key={index} index={index} />
          ))}
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={goToLogin} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNext} style={styles.nextButton}>
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width,
    height: height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emoji: {
    fontSize: 70,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  bottomContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginHorizontal: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  nextButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});