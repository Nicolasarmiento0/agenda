import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TimeWheelPicker from '../../../../components/TimeWheelPicker';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const GYM_KEYWORDS = ['gym', 'gimnasio', 'gimnasios', 'fitness'];

export default function BusinessSetupScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();

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

  // Paso 3 — Servicio (no gym)
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  const stepTitles = ['TU NEGOCIO', 'DÓNDE Y CUÁNDO', isGym ? 'RESERVAS' : 'PRIMER SERVICIO'];
  const stepSubtitles = [
    'Cuéntanos quién eres.',
    'Para que tus clientes te encuentren.',
    isGym
      ? 'Define cuándo pueden reservar tus alumnos.'
      : 'Opcional — puedes agregar más desde tu panel.',
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

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('Sin sesión');

      const businessData: Record<string, any> = {
        owner_id: userId,
        name: name.trim(),
        category_id: subCategoryId,
        address: address.trim(),
        status: 'pending',
        opening_time: `${openingTime}:00`,
        closing_time: `${closingTime}:00`,
      };

      if (isGym) {
        businessData.booking_window_day = bookingWindowDay;
        businessData.booking_window_open_time = `${bookingWindowOpenTime}:00`;
        businessData.booking_window_close_time = `${bookingWindowCloseTime}:00`;
      }

      const { data: biz, error: dbError } = await supabase
        .from('businesses')
        .insert(businessData)
        .select('id')
        .single();

      if (dbError) throw dbError;

      if (!isGym && biz?.id && serviceName.trim() && servicePrice.trim()) {
        await supabase.from('business_services').insert({
          business_id: biz.id,
          name: serviceName.trim(),
          price: parseFloat(servicePrice.replace(',', '.')) || 0,
          is_active: true,
        });
      }

      await refreshProfile();
      router.replace('/screens/roles/company/business-pending' as any);
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
              <React.Fragment key={s}>
                <View style={[styles.stepDot, { backgroundColor: s <= step ? appColors.primary : colors.border }]} />
                {s < 3 && <View style={[styles.stepLine, { backgroundColor: s < step ? appColors.primary : colors.border }]} />}
              </React.Fragment>
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
                <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DEL NEGOCIO *</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 20 }]}
                  placeholder="Ej: Barbería Los Andes"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoFocus
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
                          <Text style={[styles.subChipText, { color: subCategoryId === cat.id ? '#fff' : colors.textPrimary }]}>{cat.name}</Text>
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
                <Text style={[styles.label, { color: colors.textSecondary }]}>DIRECCIÓN *</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 24 }]}
                  placeholder="Calle, número, ciudad"
                  placeholderTextColor={colors.textSecondary}
                  value={address}
                  onChangeText={setAddress}
                  autoFocus
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>APERTURA *</Text>
                    <View style={{ transform: [{ scale: 0.75 }], marginVertical: -42 }}>
                      <TimeWheelPicker openingHour={5} closingHour={24} selectedSlot={openingTime} onSlotSelect={setOpeningTime} busyIntervals={[]} durationMinutes={30} isDarkMode={isDarkMode} />
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CIERRE *</Text>
                    <View style={{ transform: [{ scale: 0.75 }], marginVertical: -42 }}>
                      <TimeWheelPicker openingHour={5} closingHour={24} selectedSlot={closingTime} onSlotSelect={setClosingTime} busyIntervals={[]} durationMinutes={30} isDarkMode={isDarkMode} />
                    </View>
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
                      <Text style={[styles.dayChipText, { color: bookingWindowDay === i ? '#fff' : colors.textPrimary }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>HORARIO DE RESERVA</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>DESDE</Text>
                    <View style={{ transform: [{ scale: 0.75 }], marginVertical: -42 }}>
                      <TimeWheelPicker
                        openingHour={0}
                        closingHour={24}
                        selectedSlot={bookingWindowOpenTime}
                        onSlotSelect={setBookingWindowOpenTime}
                        busyIntervals={[]}
                        durationMinutes={30}
                        isDarkMode={isDarkMode}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>HASTA</Text>
                    <View style={{ transform: [{ scale: 0.75 }], marginVertical: -42 }}>
                      <TimeWheelPicker
                        openingHour={0}
                        closingHour={24}
                        selectedSlot={bookingWindowCloseTime}
                        onSlotSelect={setBookingWindowCloseTime}
                        busyIntervals={[]}
                        durationMinutes={30}
                        isDarkMode={isDarkMode}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ── PASO 3: No gym — Primer servicio (opcional) ── */}
            {step === 3 && !isGym && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DEL SERVICIO</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}
                  placeholder="Ej: Corte de cabello o Plan Básico"
                  placeholderTextColor={colors.textSecondary}
                  value={serviceName}
                  onChangeText={setServiceName}
                  autoFocus
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>PRECIO</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}
                  placeholder="Ej: 5000"
                  placeholderTextColor={colors.textSecondary}
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  keyboardType="numeric"
                />

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Podrás agregar más servicios, fotos y empleados desde tu panel una vez aprobado.
                </Text>
              </>
            )}

            {error ? <Text style={[appStyles.errorText, { marginBottom: 12 }]}>{error}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
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
                <TouchableOpacity style={[appStyles.primaryButton, { flex: 1 }]} activeOpacity={0.8} onPress={handleNext}>
                  <Text style={appStyles.primaryButtonText}>CONTINUAR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[appStyles.primaryButton, { flex: 1, opacity: saving ? 0.6 : 1 }]}
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
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  chipText: { fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
  subChipText: { fontSize: 12, fontWeight: '500' },
  dayChipText: { fontSize: 11, fontWeight: '600' },
  backBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});