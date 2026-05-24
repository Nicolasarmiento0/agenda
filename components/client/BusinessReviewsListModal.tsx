import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';
import EmptyState from '../EmptyState';

const { height } = Dimensions.get('window');

type Review = {
  score: number;
  comment: string | null;
  created_at: string;
  profiles: { nickname: string } | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onWriteReview: () => void;
};

function SkeletonItem({ isDarkMode }: { isDarkMode: boolean }) {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const placeholderBg = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <Animated.View style={[styles.skeletonRow, { opacity: animatedValue, borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonBlock, { width: 100, height: 16, backgroundColor: placeholderBg }]} />
        <View style={[styles.skeletonBlock, { width: 60, height: 12, backgroundColor: placeholderBg }]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginVertical: 6 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View key={s} style={[styles.skeletonCircle, { backgroundColor: placeholderBg }]} />
        ))}
      </View>
      <View style={[styles.skeletonBlock, { width: '90%', height: 12, backgroundColor: placeholderBg }]} />
      <View style={[styles.skeletonBlock, { width: '60%', height: 12, backgroundColor: placeholderBg, marginTop: 4 }]} />
    </Animated.View>
  );
}

export default function BusinessReviewsListModal({
  visible,
  onClose,
  businessId,
  businessName,
  onWriteReview,
}: Props) {
  const { colors, isDarkMode } = useTheme();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('score, comment, created_at, profiles(nickname)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setReviews(data as any);
      } else {
        setReviews([]);
      }
    } catch (e) {
      console.error(e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && businessId) {
      fetchReviews();
    }
  }, [visible, businessId]);

  // Calculate average & stars breakdown
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? parseFloat((reviews.reduce((acc, r) => acc + r.score, 0) / totalReviews).toFixed(1))
    : 0;

  const distribution = [0, 0, 0, 0, 0]; // 5 stars down to 1 star
  reviews.forEach((r) => {
    const idx = Math.min(Math.max(5 - Math.round(r.score), 0), 4);
    distribution[idx]++;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={[styles.sheet, { borderColor: colors.border }]}>
          <View style={[styles.inner, { backgroundColor: isDarkMode ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.94)' }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>OPINIONES DE</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {businessName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 12 }}>
                {/* Header Summary Skeleton */}
                <View style={[styles.skeletonHeaderCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                  <View style={[styles.skeletonBlock, { width: 50, height: 40, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />
                  <View style={[styles.skeletonBlock, { width: 120, height: 16, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', marginTop: 8 }]} />
                </View>
                <SkeletonItem isDarkMode={isDarkMode} />
                <SkeletonItem isDarkMode={isDarkMode} />
                <SkeletonItem isDarkMode={isDarkMode} />
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                  {totalReviews > 0 ? (
                    <>
                      {/* Summary Card */}
                      <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderColor: colors.border }]}>
                        <View style={styles.scoreBlock}>
                          <Text style={[styles.averageScoreText, { color: colors.textPrimary }]}>{averageRating}</Text>
                          <View style={{ flexDirection: 'row', marginVertical: 4 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= Math.round(averageRating) ? 'star' : 'star-outline'}
                                size={14}
                                color="#F0A030"
                              />
                            ))}
                          </View>
                          <Text style={[styles.totalReviewsText, { color: colors.textSecondary }]}>
                            {totalReviews} {totalReviews === 1 ? 'opinión' : 'opiniones'}
                          </Text>
                        </View>

                        <View style={styles.barsBlock}>
                          {distribution.map((count, index) => {
                            const stars = 5 - index;
                            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <View key={index} style={styles.distributionRow}>
                                <Text style={[styles.distributionStarLabel, { color: colors.textSecondary }]}>{stars}</Text>
                                <Ionicons name="star" size={10} color="#F0A030" style={{ marginRight: 6 }} />
                                <View style={[styles.trackBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                  <View style={[styles.fillBar, { width: `${pct}%`, backgroundColor: '#F0A030' }]} />
                                </View>
                                <Text style={[styles.distributionCountText, { color: colors.textSecondary }]}>{count}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Individual Reviews */}
                      <View style={styles.reviewsList}>
                        {reviews.map((r, i) => (
                          <View key={i} style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.reviewHeader}>
                              <Text style={[styles.reviewAuthor, { color: colors.textPrimary }]}>
                                {r.profiles?.nickname || 'Cliente'}
                              </Text>
                              <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                                {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={star <= r.score ? 'star' : 'star-outline'}
                                  size={12}
                                  color="#F0A030"
                                />
                              ))}
                            </View>

                            <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                              {r.comment ? `"${r.comment}"` : 'Sin comentario escrito.'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <View style={{ marginTop: 40 }}>
                      <EmptyState
                        icon="star"
                        title="SIN OPINIONES"
                        subtitle={`Aún no hay opiniones para ${businessName}. ¡Sé la primera persona en escribir una!`}
                      />
                    </View>
                  )}
                </ScrollView>

                {/* Floating Bottom Button */}
                <View style={[styles.footerContainer, { backgroundColor: isDarkMode ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)', borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.writeBtn, { backgroundColor: appColors.primary }]}
                    onPress={() => {
                      onClose();
                      // Small delay to let the reviews sheet close completely before opening review compose modal
                      setTimeout(() => {
                        onWriteReview();
                      }, 350);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-3" size={16} color="#111827" style={{ marginRight: 8 }} />
                    <Text style={styles.writeBtnText}>ESCRIBIR UNA OPINIÓN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.78,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    gap: 16,
    alignItems: 'center',
  },
  scoreBlock: {
    alignItems: 'center',
    width: '35%',
    justifyContent: 'center',
  },
  averageScoreText: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
  totalReviewsText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  barsBlock: {
    flex: 1,
    gap: 4,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  distributionStarLabel: {
    width: 10,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginRight: 2,
  },
  trackBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
  distributionCountText: {
    width: 20,
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginLeft: 6,
  },
  reviewsList: {
    marginTop: 16,
  },
  reviewRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  writeBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#111827',
  },
  skeletonRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBlock: {
    borderRadius: 4,
  },
  skeletonCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  skeletonHeaderCard: {
    height: 90,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
