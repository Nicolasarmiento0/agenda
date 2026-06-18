import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// 👉 Coloca logo.png en /assets/images
const LOGO = require('../assets/images/logo.png');

interface Slide {
  key: string;
  type: 'brand' | 'message';
  wordmark?: string;
  title: string;
  subtitle?: string;
  caption?: string;
}

const SLIDES: Slide[] = [
  {
    key: 's1',
    type: 'brand',
    wordmark: 'NUCORA',
    title: 'Bienvenido',
    caption: 'APP EN DESARROLLO',
  },
  {
    key: 's2',
    type: 'message',
    title: '"Gestiona menos, crece más"',
    subtitle:
      'Automatiza lo repetitivo y enfócate en lo que realmente hace crecer tu proyecto.',
  },
  {
    key: 's3',
    type: 'message',
    title: '"Todo en un\nsolo lugar"',
    subtitle:
      'Organiza tu tiempo, tus finanzas y tu equipo desde una sola pantalla.',
  },
];

interface Props {
  /** Se llama al pulsar "Iniciar" en la última slide o "Saltar". */
  onFinish?: () => void;
}

export default function OnboardingScreen({ onFinish }: Props) {
  const { colors: themeColors, isDarkMode, toggleTheme } = useTheme();

  const isDark = isDarkMode;
  const toggle = toggleTheme;

  // Custom colors for onboarding that fit perfectly with Nucora's dark/light modes
  const colors = {
    gradient: (isDarkMode
      ? ['#0A0D04', '#1A2408', '#070806']
      : ['#F7FAE9', '#FDFDFD', '#EDF5D3']) as [string, string, string],
    glow: '#B4F736',
    text: themeColors.textPrimary,
    textMuted: themeColors.textSecondary,
    textFaint: isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
    dotActive: '#B4F736',
    accent: '#B4F736',
    accentText: '#111827',
    surface: themeColors.surface,
    border: themeColors.border,
  };
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const useNative = Platform.OS !== 'web';

  // Pulso suave del resplandor y rotación elegante de las órbitas
  const pulse = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: useNative,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: useNative,
        }),
      ]),
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: useNative,
      }),
    );

    pulseAnim.start();
    rotateLoop.start();

    return () => {
      pulseAnim.stop();
      rotateLoop.stop();
    };
  }, [pulse, rotateAnim, useNative]);

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isDark ? [0.25, 0.45] : [0.35, 0.55],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinReverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        if (i !== index) setIndex(i);
      },
    },
  );

  const goNext = () => {
    if (isLast) {
      onFinish?.();
      return;
    }
    listRef.current?.scrollToOffset({
      offset: (index + 1) * width,
      animated: true,
    });
  };

  const renderItem = ({ item, index: i }: ListRenderItemInfo<Slide>) => {
    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [28, 0, 28],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width, ...(listHeight > 0 && { height: listHeight }) }]}>
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }],
            alignItems: 'center',
            paddingHorizontal: 32,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
          }}
        >
          {item.type === 'brand' ? (
            <View style={styles.center}>
              <View style={styles.logoWrap}>
                {/* Halo ambiental pulsante */}
                <Animated.View
                  style={[
                    styles.glowAmbient,
                    {
                      backgroundColor: colors.glow,
                      opacity: glowOpacity,
                      transform: [{ scale: glowScale }],
                    },
                  ]}
                />

                {/* Órbita exterior giratoria */}
                <Animated.View
                  style={[
                    styles.orbitRing,
                    styles.orbitOuter,
                    {
                      borderColor: isDark ? 'rgba(180, 247, 54, 0.25)' : 'rgba(180, 247, 54, 0.45)',
                      transform: [{ rotate: spin }],
                    },
                  ]}
                />

                {/* Órbita interior giratoria (sentido inverso) */}
                <Animated.View
                  style={[
                    styles.orbitRing,
                    styles.orbitInner,
                    {
                      borderColor: isDark ? 'rgba(180, 247, 54, 0.15)' : 'rgba(180, 247, 54, 0.35)',
                      transform: [{ rotate: spinReverse }],
                    },
                  ]}
                />

                {/* Logo centrado */}
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              </View>

              {/* Nombre de la marca con fuente Varien */}
              <Text style={[styles.wordmark, { color: colors.text }]}>
                {item.wordmark}
              </Text>
              <Text style={[styles.brandTitle, { color: colors.textMuted }]}>
                {item.title}
              </Text>
              {!!item.caption && (
                <Text style={[styles.caption, { color: colors.textFaint }]}>
                  {item.caption}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={[styles.title, { color: colors.text }]}>
                {item.title}
              </Text>
              {!!item.subtitle && (
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header: Saltar + toggle de tema */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 24 : 8) }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerSide}>
            {!isLast && (
              <Pressable hitSlop={10} onPress={() => onFinish?.()}>
                <Text style={[styles.skip, { color: colors.textMuted }]}>
                  Saltar
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={toggle}
            hitSlop={8}
            style={[
              styles.themeBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={width}
        decelerationRate="fast"
        disableIntervalMomentum
        style={styles.list}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
      />

      {/* Footer: dots + botón */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: colors.dotActive,
                  },
                ]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.accentText }]}>
            {isLast ? 'INICIAR' : 'SIGUIENTE'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070806' },
  list: { flex: 1 },
  center: { alignItems: 'center' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    width: '100%',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  headerSide: { minWidth: 60 },
  skip: { fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    position: 'relative',
    alignSelf: 'center',
  },
  glowAmbient: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    zIndex: 1,
    shadowColor: '#B4F736',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 36,
    elevation: 10,
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    zIndex: 2,
  },
  orbitOuter: {
    width: 210,
    height: 210,
  },
  orbitInner: {
    width: 180,
    height: 180,
  },
  logo: { width: 150, height: 150, zIndex: 3 },

  wordmark: {
    fontFamily: 'Varien',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 4,
    marginTop: 20,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
    marginTop: 14,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  title: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: 0.2,
    maxWidth: 420,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 20,
    maxWidth: 360,
  },

  footer: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    height: 8,
  },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },

  button: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
