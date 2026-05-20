import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { SelectedBusiness, useBusiness } from '../../../../context/BusinessContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

const { width } = Dimensions.get('window');

export default function ClientBusinessProfileScreen() {
  const { selectedBusiness, setSelectedBusiness } = useBusiness();
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fetchedBusiness, setFetchedBusiness] = useState<SelectedBusiness | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Reviews State
  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newScore, setNewScore] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gym state
  const [isGym, setIsGym] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchBusinessData = async (businessId: string) => {
    // 1. Fetch Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('score')
      .eq('business_id', businessId);
      
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.score, 0);
      setReviewsData({
        score: parseFloat((sum / reviews.length).toFixed(1)),
        total: reviews.length
      });
    } else {
      setReviewsData({ score: 0, total: 0 });
    }

    if (!selectedBusiness) {
      // Fetch Business Details if coming from a direct link or refresh
      setFetchLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
        
      if (data) {
        setFetchedBusiness(data);
        setSelectedBusiness(data);
      }
      setFetchLoading(false);
    } else {
      setFetchedBusiness(selectedBusiness);
    }

    // Now detect Gym and membership status if we have the profile and business info
    const currentBiz = selectedBusiness || (await supabase.from('businesses').select('*').eq('id', businessId).single()).data;
    if (currentBiz?.category_id && profile?.id) {
      const { data: cat } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', currentBiz.category_id)
        .single();
        
      const gymFlag = !!(cat?.name?.toUpperCase().includes('GIMNASIO') || cat?.name?.toUpperCase().includes('FITNESS'));
      setIsGym(gymFlag);
      
      if (gymFlag) {
        const { data: mem } = await supabase
          .from('gym_memberships')
          .select('status')
          .eq('business_id', currentBiz.id)
          .eq('client_id', profile.id)
          .single();
          
        if (mem && mem.status === 'active') {
          setMembershipStatus('active');
        } else {
          const { data: req } = await supabase
            .from('membership_requests')
            .select('status')
            .eq('business_id', currentBiz.id)
            .eq('client_id', profile.id)
            .single();
          if (req) setMembershipStatus(req.status);
        }
      }
    }
  };

  useEffect(() => {
    const bizId = selectedBusiness?.id || id;
    if (bizId) fetchBusinessData(bizId);
  }, [id, selectedBusiness]);

  useEffect(() => {
    if (!fetchedBusiness) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchedBusiness]);

  const handleSubmitReview = async () => {
    if (!profile?.id || !fetchedBusiness?.id) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('reviews').insert([{
      business_id: fetchedBusiness.id,
      client_id: profile.id,
      score: newScore,
      comment: newComment.trim()
    }]);

    setIsSubmitting(false);

    if (error) {
      showAlert({ title: 'Error', message: 'No pudimos guardar tu opinión. Inténtalo más tarde.' });
    } else {
      setShowReviewModal(false);
      setNewComment('');
      setNewScore(5);
      showAlert({ title: '¡Gracias!', message: 'Tu opinión ha sido guardada.' });
      fetchBusinessData(fetchedBusiness.id);
    }
  };

  const handleRequestMembership = async () => {
    if (!profile?.id || !fetchedBusiness?.id) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('membership_requests').insert([{
      business_id: fetchedBusiness.id,
      client_id: profile.id,
    }]);
    setIsSubmitting(false);

    if (error) {
      showAlert({ title: 'Error', message: 'No se pudo enviar la solicitud. Quizá ya tienes una pendiente.' });
    } else {
      showAlert({ title: 'Solicitud Enviada', message: 'El gimnasio revisará tu solicitud y te asignará un plan.' });
      setMembershipStatus('pending');
    }
  };

  if (fetchLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!fetchedBusiness) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>No hay información del negocio.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: appColors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { name, description, avatar_url, opening_time, closing_time, instagram_url, maps_url } = fetchedBusiness;
  const isPreviewMode = profile?.role === 'company';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.back()}
        style={[styles.backBtn, { backgroundColor: colors.surface, zIndex: 10 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Avatar Section */}
          <View style={[styles.avatarContainer, { borderColor: colors.background, backgroundColor: colors.surface }]}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={styles.avatar} />
            ) : (
              <Text style={[styles.avatarInitial, { color: appColors.primary }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
          
          {/* Rating Section */}
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewModal(true)} style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#F0A030" />
            <Text style={[styles.ratingScore, { color: colors.textPrimary }]}>
              {reviewsData.total > 0 ? reviewsData.score : 'Nuevo'}
            </Text>
            <Text style={[styles.ratingTotal, { color: colors.textSecondary }]}>
              ({reviewsData.total > 0 ? `${reviewsData.total} opiniones` : 'Se el primero'})
            </Text>
          </TouchableOpacity>

          {description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          <View style={styles.detailsContainer}>
            {!!opening_time && !!closing_time && (
              <View style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Horario de atención</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {opening_time.substring(0, 5)} - {closing_time.substring(0, 5)} hrs
                  </Text>
                </View>
              </View>
            )}

            {!!maps_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(maps_url)} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Google Maps</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Abrir ubicación
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!!instagram_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(instagram_url)} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="instagram" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Instagram</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver perfil
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            
            {!isPreviewMode && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewModal(true)} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="chatbubble-outline" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reputación</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Escribir una opinión
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {!isPreviewMode && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {isGym && membershipStatus === 'active' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[appStyles.primaryButton, { width: '100%' }]}
              onPress={() => router.push((`/screens/roles/client/client-agenda?id=${fetchedBusiness.id}`) as any)}
            >
              <Text style={appStyles.primaryButtonText}>VER CLASES Y RESERVAR</Text>
            </TouchableOpacity>
          ) : isGym && membershipStatus === 'pending' ? (
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[appStyles.primaryButton, { width: '100%', opacity: 0.6 }]}
                disabled
              >
                <Text style={appStyles.primaryButtonText}>SOLICITUD EN REVISIÓN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push((`/screens/roles/client/client-agenda?id=${fetchedBusiness.id}`) as any)}>
                <Text style={{ textAlign: 'center', color: appColors.primary, fontSize: 12, fontWeight: '600' }}>Ver talleres y evaluaciones extra</Text>
              </TouchableOpacity>
            </View>
          ) : isGym ? (
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[appStyles.primaryButton, { width: '100%' }]}
                onPress={handleRequestMembership}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={appStyles.primaryButtonText}>SOLICITAR INGRESO AL GIMNASIO</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push((`/screens/roles/client/client-agenda?id=${fetchedBusiness.id}`) as any)}>
                <Text style={{ textAlign: 'center', color: appColors.primary, fontSize: 12, fontWeight: '600' }}>Ver talleres y evaluaciones extra</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[appStyles.primaryButton, { width: '100%' }]}
              onPress={() => router.push((`/screens/roles/client/client-agenda?id=${fetchedBusiness.id}`) as any)}
            >
              <Text style={appStyles.primaryButtonText}>VER AGENDA Y RESERVAR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MODAL DE RESEÑAS */}
      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowReviewModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.blurCard}>
            <View style={[styles.glassContent, !isDarkMode && styles.glassContentLight]}>
            
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>¿Cómo calificarías a {name}?</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} activeOpacity={0.7} onPress={() => setNewScore(s)} style={styles.starBtn}>
                  <Ionicons name={s <= newScore ? "star" : "star-outline"} size={36} color="#F0A030" />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.reviewInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Opcional: Escribe tu opinión o sugerencia..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={250}
            />
            
            <TouchableOpacity 
              style={[appStyles.primaryButton, { marginTop: 16 }]} 
              activeOpacity={0.8} 
              disabled={isSubmitting}
              onPress={handleSubmitReview}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={appStyles.primaryButtonText}>ENVIAR OPINIÓN</Text>}
            </TouchableOpacity>
          </View>
        </BlurView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' },
    }),
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' },
    }),
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0A03015',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
    gap: 4,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingTotal: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsContainer: {
    gap: 20,
    marginTop: 10,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  /* MODAL */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  blurCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassContent: {
    backgroundColor: 'rgba(16,16,16,0.82)',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  glassContentLight: {
    backgroundColor: 'rgba(250,250,250,0.90)',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  reviewInput: {
    height: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    paddingTop: 16,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
