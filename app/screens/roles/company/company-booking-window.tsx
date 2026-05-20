import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import TimeWheelPicker from '../../../../components/TimeWheelPicker';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors } from '../../../../styles/appStyles';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CompanyBookingWindowScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bookingDay, setBookingDay] = useState(0);
  const [openTime, setOpenTime] = useState('19:00');
  const [closeTime, setCloseTime] = useState('23:00');

  useEffect(() => {
    if (!business?.id) return;
    supabase
      .from('businesses')
      .select('booking_window_day, booking_window_open_time, booking_window_close_time')
      .eq('id', business.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBookingDay(data.booking_window_day ?? 0);
          setOpenTime((data.booking_window_open_time ?? '19:00:00').slice(0, 5));
          setCloseTime((data.booking_window_close_time ?? '23:00:00').slice(0, 5));
        }
        setLoading(false);
      });
  }, [business?.id]);

  const handleSave = async () => {
    if (!business?.id) return;
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    if (ch * 60 + cm <= oh * 60 + om) {
      showAlert({ title: 'Horario inválido', message: 'La hora de cierre debe ser posterior a la de apertura.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('businesses')
      .update({
        booking_window_day: bookingDay,
        booking_window_open_time: openTime + ':00',
        booking_window_close_time: closeTime + ':00',
      })
      .eq('id', business.id);
    setSaving(false);
    if (error) {
      showAlert({ title: 'Error', message: 'No se pudo guardar. Intenta nuevamente.' });
    } else {
      showAlert({ title: '¡Guardado!', message: 'La ventana de reserva ha sido actualizada.' });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>TOMA DE HORARIO</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Configura el día y rango horario en que tus clientes fijos podrán seleccionar sus clases semanales.
          </Text>

          {/* Day selector */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DÍA DE SELECCIÓN</Text>
            <View style={styles.daysGrid}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayBtn,
                    { borderColor: colors.border },
                    bookingDay === i && { backgroundColor: appColors.primary, borderColor: appColors.primary },
                  ]}
                  onPress={() => setBookingDay(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayBtnText, { color: bookingDay === i ? '#fff' : colors.textPrimary }]}>
                    {d.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.selectedDayLabel, { color: colors.textPrimary }]}>
              Día seleccionado:{' '}
              <Text style={{ color: appColors.primary, fontWeight: '700' }}>{DAYS[bookingDay]}</Text>
            </Text>
          </View>

          {/* Time pickers in 2 columns */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 8 }]}>HORA DE APERTURA</Text>
              <TimeWheelPicker
                openingHour={0}
                closingHour={24}
                selectedSlot={openTime}
                onSlotSelect={setOpenTime}
                busyIntervals={[]}
                durationMinutes={0}
                isDarkMode={isDarkMode}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 8 }]}>HORA DE CIERRE</Text>
              <TimeWheelPicker
                openingHour={0}
                closingHour={24}
                selectedSlot={closeTime}
                onSlotSelect={setCloseTime}
                busyIntervals={[]}
                durationMinutes={0}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>

          {/* Summary */}
          <View style={[styles.summaryCard, { backgroundColor: appColors.primary + '12', borderColor: appColors.primary + '30' }]}>
            <Feather name="info" size={16} color={appColors.primary} />
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
              Los clientes fijos podrán elegir sus clases el{' '}
              <Text style={{ fontWeight: '700' }}>{DAYS[bookingDay]}</Text> de{' '}
              <Text style={{ fontWeight: '700' }}>{openTime}</Text> a{' '}
              <Text style={{ fontWeight: '700' }}>{closeTime}</Text>.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: appColors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>GUARDAR CAMBIOS</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDayLabel: {
    fontSize: 13,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  summaryText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
