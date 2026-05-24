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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { SelectedBusiness, useBusiness } from '../../../../context/BusinessContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';
import BusinessReviewsListModal from '../../../../components/client/BusinessReviewsListModal';

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
  const [showReviewsListModal, setShowReviewsListModal] = useState(false);
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
      <View style={[appStyles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!fetchedBusiness) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
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
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.back()}
        style={[appStyles.clientProfileBackBtn, { backgroundColor: colors.surface, zIndex: 10 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={[appStyles.clientProfileContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Avatar Section */}
          <View style={[appStyles.clientProfileAvatarContainer, { borderColor: colors.background, backgroundColor: colors.surface }]}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={appStyles.clientProfileAvatar} />
            ) : (
              <Text style={[appStyles.clientProfileAvatarInitial, { color: appColors.primary }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={[appStyles.clientProfileName, { color: colors.textPrimary }]}>{name}</Text>

          {/* Rating Section */}
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewsListModal(true)} style={appStyles.clientProfileRatingBadge}>
            <Ionicons name="star" size={14} color="#F0A030" />
            <Text style={[appStyles.clientProfileRatingScore, { color: colors.textPrimary }]}>
              {reviewsData.total > 0 ? reviewsData.score : 'Nuevo'}
            </Text>
            <Text style={[appStyles.clientProfileRatingTotal, { color: colors.textSecondary }]}>
              ({reviewsData.total > 0 ? `${reviewsData.total} opiniones` : 'Se el primero'})
            </Text>
          </TouchableOpacity>

          {description ? (
            <Text style={[appStyles.clientProfileDescription, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          <View style={appStyles.clientProfileDetailsContainer}>
            {!!opening_time && !!closing_time && (
              <View style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Horario de atención</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]}>
                    {opening_time.substring(0, 5)} - {closing_time.substring(0, 5)} hrs
                  </Text>
                </View>
              </View>
            )}

            {!!maps_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(maps_url)} style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Google Maps</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Abrir ubicación
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!!instagram_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(instagram_url)} style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="instagram" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Instagram</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver perfil
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!isPreviewMode && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewsListModal(true)} style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="chatbubble-outline" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Reputación</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver opiniones de clientes
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {!isPreviewMode && (
        <View style={[appStyles.clientProfileFooter, { backgroundColor: colors.background, borderTopColor: colors.border, }]}>
          {isGym && membershipStatus === 'active' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[appStyles.primaryButton, { width: '100%' }]}
              onPress={() =>
                router.push(
                  `/screens/global/calendar` as any
                )
              }
            >
              <Text style={appStyles.primaryButtonText}>
                VER CLASES Y RESERVAR
              </Text>
            </TouchableOpacity>
          ) : isGym && membershipStatus === 'pending' ? (
            <View style={{ gap: 12, width: '100%' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[appStyles.primaryButton, { width: '100%', opacity: 0.6 }]}
                disabled
              >
                <Text style={appStyles.primaryButtonText}>SOLICITUD EN REVISIÓN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/screens/global/calendar` as any)}>
                <Text style={{ textAlign: 'center', color: appColors.primary, fontSize: 12, fontWeight: '600' }}>Ver talleres y evaluaciones extra</Text>
              </TouchableOpacity>
            </View>
          ) : isGym ? (
            <View style={{ gap: 12, width: '100%' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[appStyles.primaryButton, { width: '100%' }]}
                onPress={handleRequestMembership}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#111827" /> : <Text style={appStyles.primaryButtonText}>SOLICITAR INGRESO AL GIMNASIO</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/screens/global/calendar` as any)}>
                <Text style={{ textAlign: 'center', color: appColors.primary, fontSize: 12, fontWeight: '600' }}>Ver talleres y evaluaciones extra</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[appStyles.primaryButton, { width: '100%' }]}
              onPress={() => router.push(`/screens/global/calendar` as any)}
            >
              <Text style={appStyles.primaryButtonText}>VER AGENDA Y RESERVAR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MODAL DE RESEÑAS */}
      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={appStyles.clientProfileModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowReviewModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={appStyles.clientProfileBlurCard}>
            <View style={[appStyles.clientProfileGlassContent, !isDarkMode && appStyles.clientProfileGlassContentLight]}>

              <Text style={[appStyles.clientProfileModalTitle, { color: colors.textPrimary }]}>¿Cómo calificarías a {name}?</Text>

              <View style={appStyles.clientProfileStarsContainer}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} activeOpacity={0.7} onPress={() => setNewScore(s)} style={appStyles.clientProfileStarBtn}>
                    <Ionicons name={s <= newScore ? "star" : "star-outline"} size={36} color="#F0A030" />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[appStyles.clientProfileReviewInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
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
                {isSubmitting ? <ActivityIndicator color="#111827" /> : <Text style={appStyles.primaryButtonText}>ENVIAR OPINIÓN</Text>}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* DETALLE Y LISTADO DE OPINIONES */}
      <BusinessReviewsListModal
        visible={showReviewsListModal}
        onClose={() => setShowReviewsListModal(false)}
        businessId={fetchedBusiness.id}
        businessName={name}
        onWriteReview={() => setShowReviewModal(true)}
      />

    </View>
  );
}
