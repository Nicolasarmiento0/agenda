import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import GlassCard from '../../../../components/GlassCard';
import ScreenHeader from '../../../../components/ScreenHeader';
import TimeWheelPicker from '../../../../components/TimeWheelPicker';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

type TimeBlock = { start: string; end: string };

const DAYS = [
  { id: '1', name: 'Lunes', short: 'L' },
  { id: '2', name: 'Martes', short: 'M' },
  { id: '3', name: 'Miércoles', short: 'X' },
  { id: '4', name: 'Jueves', short: 'J' },
  { id: '5', name: 'Viernes', short: 'V' },
  { id: '6', name: 'Sábado', short: 'S' },
  { id: '7', name: 'Domingo', short: 'D' },
];

export default function EditScheduleScreen() {
  const { business, refreshProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();

  // Horarios del negocio — el picker de bloques queda acotado a estos límites
  const businessOpenHour = business?.opening_time
    ? parseInt(business.opening_time.slice(0, 2), 10)
    : 0;
  const businessCloseHourRaw = business?.closing_time ? business.closing_time.slice(0, 5).split(':') : null;
  const businessCloseHour = businessCloseHourRaw ? parseInt(businessCloseHourRaw[0], 10) : 23;
  const businessCloseTime = businessCloseHourRaw
    ? parseInt(businessCloseHourRaw[0], 10) + parseInt(businessCloseHourRaw[1], 10) / 60
    : 23;

  const [activeDays, setActiveDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [weeklyBlocks, setWeeklyBlocks] = useState<TimeBlock[]>([{ start: '10:00', end: '21:00' }]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{ blockIndex: number; field: 'start' | 'end'; } | null>(null);
  const [tempTime, setTempTime] = useState('09:00');

  useEffect(() => {
    fetchSchedule();
  }, [business?.id]);

  const fetchSchedule = async () => {
    if (!business?.id) return;
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('schedule, opening_time, closing_time')
        .eq('id', business.id)
        .single();

      if (error) throw error;

      // Límites del negocio para recortar bloques que excedan el horario
      const openStr = (data.opening_time || business.opening_time || '00:00').slice(0, 5);
      const closeStr = (data.closing_time || business.closing_time || '23:59').slice(0, 5);

      const clipBlocks = (blocks: TimeBlock[]): TimeBlock[] =>
        blocks
          .map(b => ({
            start: b.start < openStr ? openStr : b.start,
            end: b.end > closeStr ? closeStr : b.end,
          }))
          .filter(b => b.start < b.end);

      if (data.schedule) {
        const scheduleObj = data.schedule;
        const active = Object.keys(scheduleObj).filter(k => scheduleObj[k].length > 0);
        setActiveDays(active);
        if (active.length > 0) {
          setWeeklyBlocks(clipBlocks(scheduleObj[active[0]]));
        } else {
          setWeeklyBlocks([]);
        }
      } else {
        // Fallback a los horarios base si no hay schedule JSONB
        const baseBlock = data.opening_time && data.closing_time
          ? [{ start: data.opening_time.slice(0, 5), end: data.closing_time.slice(0, 5) }]
          : [{ start: openStr, end: closeStr }];

        setWeeklyBlocks(clipBlocks(baseBlock));
        setActiveDays(['1', '2', '3', '4', '5', '6']); // Por defecto lun-sab
      }
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      let minStart = '23:59';
      let maxEnd = '00:00';

      const scheduleToSave: Record<string, TimeBlock[]> = {
        '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': []
      };

      activeDays.forEach(d => {
        scheduleToSave[d] = weeklyBlocks;
        weeklyBlocks.forEach(b => {
          if (b.start < minStart) minStart = b.start;
          if (b.end > maxEnd) maxEnd = b.end;
        });
      });

      const updateData: any = { schedule: scheduleToSave };
      if (minStart !== '23:59') updateData.opening_time = minStart + ':00';
      if (maxEnd !== '00:00') updateData.closing_time = maxEnd + ':00';

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', business.id);

      if (error) throw error;
      
      await refreshProfile();
      
      showAlert({ 
        title: '¡Éxito!', 
        message: 'Horario general guardado correctamente.', 
        buttons: [{
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/screens/roles/company/dashboard-company' as any);
            }
          }
        }] 
      });
    } catch (e: any) {
      showAlert({ title: 'Error al guardar', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId: string) => {
    if (activeDays.includes(dayId)) {
      setActiveDays(activeDays.filter(d => d !== dayId));
    } else {
      setActiveDays([...activeDays, dayId]);
    }
  };

  const addBlock = () => {
    setWeeklyBlocks([...weeklyBlocks, { start: '09:00', end: '18:00' }]);
  };

  const removeBlock = (index: number) => {
    const current = [...weeklyBlocks];
    current.splice(index, 1);
    setWeeklyBlocks(current);
  };

  const openPicker = (blockIndex: number, field: 'start' | 'end') => {
    setTempTime(weeklyBlocks[blockIndex][field]);
    setPickerConfig({ blockIndex, field });
    setPickerVisible(true);
  };

  const confirmTime = () => {
    if (pickerConfig) {
      const current = [...weeklyBlocks];
      current[pickerConfig.blockIndex][pickerConfig.field] = tempTime;
      setWeeklyBlocks(current);
    }
    setPickerVisible(false);
  };

  if (loading) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="HORARIO SEMANAL" onLeft={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/screens/roles/company/dashboard-company' as any);
        }
      }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 }}>
          Define tu esquema de horario general semanal. Selecciona qué días abres y los bloques de horario para esos días. Los días no seleccionados quedarán cerrados.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>DÍAS DE APERTURA</Text>
        <GlassCard style={{ padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DAYS.map(day => {
              const isActive = activeDays.includes(day.id);
              return (
                <TouchableOpacity
                  key={day.id}
                  activeOpacity={0.7}
                  onPress={() => toggleDay(day.id)}
                  style={[
                    styles.dayChip,
                    { 
                      backgroundColor: isActive ? appColors.primary : colors.surface,
                      borderColor: isActive ? appColors.primary : colors.border
                    }
                  ]}
                >
                  <Text style={[styles.dayChipText, { color: isActive ? '#111827' : colors.textSecondary }]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginBottom: 0 }]}>BLOQUES DE HORARIO</Text>
          <TouchableOpacity onPress={addBlock} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="plus-circle" size={16} color={appColors.primary} />
            <Text style={{ color: appColors.primary, fontSize: 13, fontWeight: '600' }}>Añadir bloque</Text>
          </TouchableOpacity>
        </View>

        {weeklyBlocks.length === 0 ? (
          <GlassCard style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Sin bloques definidos. El negocio estará cerrado los días seleccionados.</Text>
          </GlassCard>
        ) : (
          weeklyBlocks.map((block, i) => (
            <GlassCard key={i} style={{ padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                
                <TouchableOpacity 
                  style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openPicker(i, 'start')}
                >
                  <Text style={[styles.timeBtnText, { color: colors.textPrimary }]}>{block.start}</Text>
                </TouchableOpacity>
                
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>hasta</Text>
                
                <TouchableOpacity 
                  style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openPicker(i, 'end')}
                >
                  <Text style={[styles.timeBtnText, { color: colors.textPrimary }]}>{block.end}</Text>
                </TouchableOpacity>

              </View>
              
              <TouchableOpacity onPress={() => removeBlock(i)} style={{ padding: 12, marginLeft: 8 }}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            </GlassCard>
          ))
        )}

      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[appStyles.primaryButton, { width: '100%', opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#000" /> : <Text style={appStyles.primaryButtonText}>GUARDAR HORARIOS</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {pickerConfig?.field === 'start' ? 'Hora de inicio' : 'Hora de fin'}
            </Text>
            
            <TimeWheelPicker
              openingHour={businessOpenHour}
              closingHour={businessCloseHour}
              selectedSlot={tempTime}
              onSlotSelect={(t) => setTempTime(t)}
              busyIntervals={[]}
              durationMinutes={10}
              isDarkMode={isDarkMode}
              closedAfter={businessCloseTime}
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

    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
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
  }
});
