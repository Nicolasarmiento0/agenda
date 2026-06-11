import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import GlassInput from '../../components/GlassInput';
import TimeWheelPicker from '../../components/TimeWheelPicker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const GYM_KEYWORDS = ['gym', 'gimnasio', 'gimnasios', 'fitness'];

const cropImageWeb = (uri: string, zoom: number, x: number, y: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not on Web platform'));
      return;
    }
    const img = new window.Image();
    img.src = uri;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = 300;
      canvas.height = 300;
      
      const frameVisualSize = 200;
      const sourceToVisualRatio = Math.min(img.width, img.height) / frameVisualSize;
      const sSize = Math.min(img.width, img.height) / zoom;
      
      const sourceOffsetX = x * sourceToVisualRatio;
      const sourceOffsetY = y * sourceToVisualRatio;
      
      const sx = (img.width - sSize) / 2 - sourceOffsetX;
      const sy = (img.height - sSize) / 2 - sourceOffsetY;
      
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 300, 300);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
  });
};

export default function BusinessSetupScreen() {
  const { profile, business, refreshProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();

  // States for dynamic image cropping
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<Category[]>([]);

  // Paso 1
  const [name, setName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  // Paso 2
  const [address, setAddress] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('20:00');

  // Paso 3 — Gym: ventana de reserva dinámica
  const [bookingWindowDay, setBookingWindowDay] = useState(0);
  const [bookingWindowOpenTime, setBookingWindowOpenTime] = useState('19:00');
  const [bookingWindowCloseTime, setBookingWindowCloseTime] = useState('23:00');

  // Paso 3 — Completar Después (no gym)
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Time picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'opening' | 'closing' | 'bookingOpen' | 'bookingClose' | null>(null);
  const [tempTime, setTempTime] = useState('09:00');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Redirigir si ya existe un negocio pendiente o aprobado
  useEffect(() => {
    if (business && business.status === 'pending') {
      router.replace('/business-pending');
    } else if (business && business.status === 'approved') {
      router.replace('/dashboard-company');
    }
  }, [business]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
    supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === parentCategoryId);

  const selectedParent = parentCategories.find(c => c.id === parentCategoryId);
  const selectedSub = categories.find(c => c.id === subCategoryId);
  const isGym = GYM_KEYWORDS.some(kw =>
    selectedParent?.name?.toLowerCase().includes(kw) ||
    selectedSub?.name?.toLowerCase().includes(kw)
  );

  const stepTitles = ['TU NEGOCIO', 'DÓNDE Y CUÁNDO', isGym ? 'RESERVAS' : 'COMPLETAR DESPUÉS'];
  const stepSubtitles = [
    'Cuéntanos quién eres.',
    'Para que tus clientes te encuentren.',
    isGym
      ? 'Define cuándo pueden reservar tus alumnos.'
      : 'Agrega una foto, tu cuenta de Instagram y una descripción (opcional).',
  ];

  const goToStep = (next: 1 | 2 | 3) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      animateIn();
    });
  };

  const validateStep1 = () => {
    if (!name.trim()) { setError('El nombre del negocio es obligatorio.'); return false; }
    if (!parentCategoryId) { setError('Selecciona un sector.'); return false; }
    if (!subCategoryId) { setError('Selecciona una especialidad.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim()) { setError('La dirección es obligatoria.'); return false; }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) goToStep(2);
    else if (step === 2 && validateStep2()) goToStep(3);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesitan permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        if (Platform.OS === 'web') {
          setTempImageUri(result.assets[0].uri);
          setCropZoom(1);
          setCropX(0);
          setCropY(0);
          setCropModalVisible(true);
        } else {
          uploadImage(result.assets[0].uri);
        }
      }
    } catch (err) {
      setError('No se pudo abrir la galería');
    }
  };

  const handleCropSave = async () => {
    if (!tempImageUri) return;
    setCropModalVisible(false);
    setIsUploading(true);
    try {
      const croppedUri = await cropImageWeb(tempImageUri, cropZoom, cropX, cropY);
      await uploadImage(croppedUri);
    } catch (e: any) {
      setError('Error al recortar la imagen: ' + e.message);
      setIsUploading(false);
    }
  };

  const uploadImage = async (imageUri: string) => {
    const userId = profile?.id;
    if (!userId) return;
    setIsUploading(true);
    setError('');
    try {
      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filePath = `${userId}/business_${Date.now()}.${ext}`;

      let body: any;
      let contentType: string | undefined;

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        body = await response.blob();
        contentType = `image/${ext}`;
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: filePath.split('/')[1],
          type: `image/${ext}`,
        } as any);
        body = formData;
        contentType = undefined;
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, body, {
          upsert: true,
          contentType,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      setError(`Error al subir imagen: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const openTimePicker = (field: 'opening' | 'closing' | 'bookingOpen' | 'bookingClose') => {
    let initialTime = '09:00';
    if (field === 'opening') initialTime = openingTime;
    else if (field === 'closing') initialTime = closingTime;
    else if (field === 'bookingOpen') initialTime = bookingWindowOpenTime;
    else if (field === 'bookingClose') initialTime = bookingWindowCloseTime;
    
    setTempTime(initialTime);
    setPickerField(field);
    setPickerVisible(true);
  };

  const confirmTime = () => {
    if (pickerField === 'opening') setOpeningTime(tempTime);
    else if (pickerField === 'closing') setClosingTime(tempTime);
    else if (pickerField === 'bookingOpen') setBookingWindowOpenTime(tempTime);
    else if (pickerField === 'bookingClose') setBookingWindowCloseTime(tempTime);
    setPickerVisible(false);
    setPickerField(null);
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('Sin sesión');

      // Crear un horario por defecto
      const defaultSchedule: Record<string, any> = {
        '1': [{ start: openingTime, end: closingTime }],
        '2': [{ start: openingTime, end: closingTime }],
        '3': [{ start: openingTime, end: closingTime }],
        '4': [{ start: openingTime, end: closingTime }],
        '5': [{ start: openingTime, end: closingTime }],
        '6': [{ start: openingTime, end: closingTime }],
        '7': [],
      };

      const businessData: Record<string, any> = {
        owner_id: userId,
        name: name.trim(),
        category_id: subCategoryId,
        address: address.trim(),
        status: 'pending',
        opening_time: `${openingTime}:00`,
        closing_time: `${closingTime}:00`,
        avatar_url: avatarUrl || null,
        instagram_url: instagramUrl.trim() || null,
        description: description.trim() || null,
        schedule: defaultSchedule,
      };

      if (isGym) {
        businessData.booking_window_day = bookingWindowDay;
        businessData.booking_window_open_time = `${bookingWindowOpenTime}:00`;
        businessData.booking_window_close_time = `${bookingWindowCloseTime}:00`;
      }

      // Si ya existe un negocio (ej. rechazado), hacemos upsert por ID
      if (business?.id) {
        businessData.id = business.id;
      }

      const { data: biz, error: dbError } = await supabase
        .from('businesses')
        .upsert(businessData)
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Seed de relaciones iniciales SOLO si es un negocio nuevo
      if (!business?.id && biz?.id) {
        // 1. Agregar al dueño como primer empleado
        await supabase.from('workers').insert({
          business_id: biz.id,
          user_id: userId,
          name: profile?.nickname || 'Propietario',
          specialty: 'Servicios Generales',
          color: '#3B7BE0',
          active: true,
          available_days: ['1', '2', '3', '4', '5', '6']
        });

        // 2. Agregar un servicio general por defecto
        if (!isGym) {
          await supabase.from('business_services').insert({
            business_id: biz.id,
            name: 'Servicio Estándar',
            price: 10000,
            duration_min: 30,
            is_active: true,
          });
        }
      }

      await refreshProfile();
      router.replace('/business-pending');
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>NUEVO NEGOCIO</Text>
          <View style={styles.stepper}>
            {([1, 2, 3] as const).map(s => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.stepDot, { backgroundColor: s <= step ? appColors.primary : colors.border }]} />
                {s < 3 && <View style={[styles.stepLine, { backgroundColor: s < step ? appColors.primary : colors.border }]} />}
              </View>
            ))}
          </View>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>{step}/3</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={[appStyles.title, { color: colors.textPrimary, paddingVertical: 4 }]}>
              {stepTitles[step - 1]}
            </Text>
            <Text style={[appStyles.subtitle, { color: colors.textSecondary, marginBottom: 28 }]}>
              {stepSubtitles[step - 1]}
            </Text>

            {/* ── PASO 1: Identidad ── */}
            {step === 1 && (
              <>
                <GlassInput
                  label="NOMBRE DEL NEGOCIO *"
                  placeholder="Ej: Barbería Los Andes"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  style={{ marginBottom: 20 }}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>SECTOR *</Text>
                <View style={styles.chipGrid}>
                  {parentCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.7}
                      onPress={() => { setParentCategoryId(cat.id); setSubCategoryId(''); }}
                      style={[styles.categoryChip, {
                        borderColor: parentCategoryId === cat.id ? appColors.primary : colors.border,
                        backgroundColor: parentCategoryId === cat.id ? `${appColors.primary}18` : colors.surface,
                      }]}
                    >
                      <Feather name={(cat.icon as any) || 'grid'} size={14} color={parentCategoryId === cat.id ? appColors.primary : colors.textSecondary} />
                      <Text style={[styles.chipText, { color: parentCategoryId === cat.id ? appColors.primary : colors.textPrimary }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {parentCategoryId ? (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4 }]}>ESPECIALIDAD *</Text>
                    <View style={styles.chipGrid}>
                      {subCategories.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.7}
                          onPress={() => setSubCategoryId(cat.id)}
                          style={[styles.subChip, {
                            borderColor: subCategoryId === cat.id ? appColors.primary : colors.border,
                            backgroundColor: subCategoryId === cat.id ? appColors.primary : colors.surface,
                          }]}
                        >
                          <Text style={[styles.subChipText, { color: subCategoryId === cat.id ? '#111827' : colors.textPrimary }]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}

            {/* ── PASO 2: Ubicación y horario ── */}
            {step === 2 && (
              <>
                <GlassInput
                  label="DIRECCIÓN *"
                  placeholder="Calle, número, ciudad"
                  value={address}
                  onChangeText={setAddress}
                  autoFocus
                  style={{ marginBottom: 24 }}
                />

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>APERTURA *</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTimePicker('opening')}
                      style={[styles.timeSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={16} color={appColors.primary} />
                      <Text style={[styles.timeSelectBtnText, { color: colors.textPrimary }]}>{openingTime}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>CIERRE *</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTimePicker('closing')}
                      style={[styles.timeSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={16} color={appColors.primary} />
                      <Text style={[styles.timeSelectBtnText, { color: colors.textPrimary }]}>{closingTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* ── PASO 3: Gym — Ventana de reserva dinámica ── */}
            {step === 3 && isGym && (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 20 }]}>
                  Los alumnos dinámicos podrán reservar sus clases de la semana siguiente dentro de esta ventana.
                  Los alumnos estáticos tendrán su horario fijo asignado desde tu panel.
                </Text>

                <Text style={[styles.label, { color: colors.textSecondary }]}>DÍA DE APERTURA DE RESERVAS</Text>
                <View style={[styles.chipGrid, { marginBottom: 20 }]}>
                  {DAY_LABELS.map((label, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={() => setBookingWindowDay(i)}
                      style={[styles.dayChip, {
                        borderColor: bookingWindowDay === i ? appColors.primary : colors.border,
                        backgroundColor: bookingWindowDay === i ? appColors.primary : colors.surface,
                      }]}
                    >
                      <Text style={[styles.dayChipText, { color: bookingWindowDay === i ? '#111827' : colors.textPrimary }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>HORARIO DE RESERVA</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 6 }]}>DESDE</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTimePicker('bookingOpen')}
                      style={[styles.timeSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={16} color={appColors.primary} />
                      <Text style={[styles.timeSelectBtnText, { color: colors.textPrimary }]}>{bookingWindowOpenTime}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 6 }]}>HASTA</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTimePicker('bookingClose')}
                      style={[styles.timeSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={16} color={appColors.primary} />
                      <Text style={[styles.timeSelectBtnText, { color: colors.textPrimary }]}>{bookingWindowCloseTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* ── PASO 3: No gym — Completar después (opcional) ── */}
            {step === 3 && !isGym && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>FOTO DE PERFIL / LOGO</Text>
                <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage} disabled={isUploading}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.pickerImage} />
                  ) : (
                    <View style={[styles.pickerImage, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                      <Feather name="camera" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={[styles.pickerBadge, { backgroundColor: appColors.primary }]}>
                    <Feather name={isUploading ? "loader" : "edit-2"} size={12} color="#111827" />
                  </View>
                </TouchableOpacity>

                <GlassInput
                  label="DIRECCIÓN DE INSTAGRAM"
                  placeholder="https://instagram.com/tu-negocio"
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                  autoCapitalize="none"
                  style={{ marginBottom: 16 }}
                />

                <GlassInput
                  label="ACERCA DE / DESCRIPCIÓN"
                  placeholder="Escribe una breve descripción de tu negocio..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  inputStyle={{ height: 80 }}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}

            {error ? <Text style={[appStyles.errorText, { marginBottom: 12 }]}>{error}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, alignItems: 'center' }}>
              {step > 1 && (
                <TouchableOpacity
                  style={[styles.backBtn, { borderColor: colors.border }]}
                  onPress={() => { setError(''); goToStep((step - 1) as 1 | 2); }}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              )}

              {step < 3 ? (
                <TouchableOpacity style={[appStyles.primaryButton, { flex: 1, marginTop: 0 }]} activeOpacity={0.8} onPress={handleNext}>
                  <Text style={appStyles.primaryButtonText}>CONTINUAR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[appStyles.primaryButton, { flex: 1, marginTop: 0, opacity: saving ? 0.6 : 1 }]}
                  activeOpacity={0.8}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  <Text style={appStyles.primaryButtonText}>{saving ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      {/* ── Modal Universal de Time Picker ── */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {pickerField === 'opening' ? 'Hora de apertura' 
               : pickerField === 'closing' ? 'Hora de cierre'
               : pickerField === 'bookingOpen' ? 'Apertura de reservas'
               : 'Cierre de reservas'}
            </Text>
            
            <TimeWheelPicker
              openingHour={0}
              closingHour={24}
              selectedSlot={tempTime}
              onSlotSelect={(t) => setTempTime(t)}
              busyIntervals={[]}
              durationMinutes={10}
              isDarkMode={isDarkMode}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]} 
                onPress={() => setPickerVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: appColors.primary }]} 
                onPress={confirmTime}
              >
                <Text style={[styles.modalBtnText, { color: '#111827' }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Web Image Cropping Modal */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View style={styles.cropModalOverlay}>
          <View style={[styles.cropModalCard, { backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)', borderColor: colors.border }]}>
            <Text style={[styles.cropModalTitle, { color: colors.textPrimary }]}>AJUSTAR LOGO DEL NEGOCIO</Text>
            <Text style={[styles.cropModalSubtitle, { color: colors.textSecondary }]}>
              Usa los controles para encuadrar y acercar tu logo perfectamente.
            </Text>

            {/* Area de Previsualizacion */}
            <View style={[styles.cropFrameContainer, { borderColor: colors.border, backgroundColor: isDarkMode ? '#000' : '#f0f0f0' }]}>
              <View style={styles.cropCircleMask}>
                {tempImageUri && (
                  <ExpoImage
                    source={{ uri: tempImageUri }}
                    style={[
                      styles.cropPreviewImage,
                      {
                        transform: [
                          { scale: cropZoom },
                          { translateX: cropX },
                          { translateY: cropY },
                        ],
                      },
                    ]}
                    contentFit="contain"
                  />
                )}
              </View>
              {/* Lineas de cuadrícula */}
              <View style={[styles.cropGridLineH, { top: '33.3%' }]} />
              <View style={[styles.cropGridLineH, { top: '66.6%' }]} />
              <View style={[styles.cropGridLineV, { left: '33.3%' }]} />
              <View style={[styles.cropGridLineV, { left: '66.6%' }]} />
            </View>

            {/* Controles de Ajuste */}
            <View style={styles.cropControlsContainer}>
              {/* Zoom Slider / Botones */}
              <View style={styles.cropControlSection}>
                <Text style={[styles.cropControlLabel, { color: colors.textSecondary }]}>ZOOM: {Math.round(cropZoom * 100)}%</Text>
                <View style={styles.cropZoomRow}>
                  <TouchableOpacity
                    style={[styles.cropZoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.max(1, z - 0.1))}
                  >
                    <Feather name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  
                  <View style={[styles.cropSliderTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.cropSliderFill, { width: `${Math.min(100, Math.max(0, (cropZoom - 1) / 3 * 100))}%`, backgroundColor: colors.primary }]} />
                  </View>

                  <TouchableOpacity
                    style={[styles.cropZoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.min(4, z + 0.1))}
                  >
                    <Feather name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* D-Pad Cockpit para mover la foto */}
              <View style={styles.cropControlSection}>
                <Text style={[styles.cropControlLabel, { color: colors.textSecondary, marginBottom: 8 }]}>POSICIÓN</Text>
                <View style={styles.cropDpadContainer}>
                  {/* Fila Superior: Arriba */}
                  <View style={styles.cropDpadRow}>
                    <TouchableOpacity
                      style={[styles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y - 5)}
                    >
                      <Feather name="chevron-up" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Media: Izquierda, Reset, Derecha */}
                  <View style={styles.cropDpadRowMid}>
                    <TouchableOpacity
                      style={[styles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x - 5)}
                    >
                      <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cropDpadCenterBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setCropX(0);
                        setCropY(0);
                        setCropZoom(1);
                      }}
                    >
                      <Text style={styles.cropDpadCenterText}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x + 5)}
                    >
                      <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Inferior: Abajo */}
                  <View style={styles.cropDpadRow}>
                    <TouchableOpacity
                      style={[styles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y + 5)}
                    >
                      <Feather name="chevron-down" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Acciones del Modal */}
            <View style={styles.cropModalActions}>
              <TouchableOpacity
                style={[styles.cropModalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setCropModalVisible(false)}
              >
                <Text style={[styles.cropModalBtnCancelText, { color: colors.textSecondary }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cropModalBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleCropSave}
              >
                <Text style={styles.cropModalBtnSaveText}>APLICAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 8,
  },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  stepCount: { fontSize: 11, letterSpacing: 1, minWidth: 24, textAlign: 'right' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 28, height: 1.5, marginHorizontal: 4 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  chipText: { fontSize: 11, letterSpacing: 0.5, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  subChipText: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  dayChipText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  backBtn: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: 999, // Perfect circular shape matching radii.full
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  timeSelectBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  imagePickerContainer: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pickerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  pickerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Estilos del Cropper Modal Premium (Web)
  cropModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cropModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' },
    }),
  },
  cropModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  cropModalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  cropFrameContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  cropCircleMask: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropPreviewImage: {
    width: 200,
    height: 200,
  },
  cropGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cropGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cropControlsContainer: {
    width: '100%',
    gap: 16,
    marginVertical: 10,
  },
  cropControlSection: {
    width: '100%',
    alignItems: 'center',
  },
  cropControlLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cropZoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
  },
  cropZoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropSliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cropSliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  cropDpadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    position: 'relative',
  },
  cropDpadRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  cropDpadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadCenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadCenterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  cropModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cropModalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropModalBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
  cropModalBtnSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropModalBtnSaveText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
});