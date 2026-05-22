import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateLabel, isToday } from '../calendar/modals/agendaHelpers';
import { calendarTokens } from './calendarTokens';
import { CalendarViewMode } from './types';

const VIEW_MODES: CalendarViewMode[] = ['day', 'week', 'month'];
const VIEW_LABELS: Record<CalendarViewMode, string> = { day: 'Día', week: 'Semana', month: 'Mes' };

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  selectedDate: Date;
  isDarkMode: boolean;
  colors: { textPrimary: string; textSecondary: string; border: string; primary: string; surface: string };
  onToggleSidebar: () => void;
  onChangeViewMode: (m: CalendarViewMode) => void;
  onNavigate: (delta: number) => void;
  onToday: () => void;
  onToggleTheme: () => void;
}

export function CalendarHeader({
  viewMode, selectedDate, isDarkMode, colors,
  onToggleSidebar, onChangeViewMode, onNavigate, onToday, onToggleTheme,
}: CalendarHeaderProps) {
  const insets = useSafeAreaInsets();
  const todayActive = isToday(selectedDate) && viewMode === 'day';
  const surfaceBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          borderBottomColor: borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Row 1: Menu + title + controls */}
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onToggleSidebar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú lateral"
          style={[styles.iconBtn, { backgroundColor: surfaceBg }]}
        >
          <Feather name="menu" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Date label */}
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={[styles.dateLabel, { color: colors.textPrimary }]} numberOfLines={1}>
            {formatDateLabel(selectedDate)}
          </Text>
        </View>

        {/* Today button */}
        <TouchableOpacity
          onPress={onToday}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ir a hoy"
          style={[
            styles.todayBtn,
            {
              backgroundColor: todayActive ? calendarTokens.todayBg : surfaceBg,
              borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.todayBtnText,
              { color: todayActive ? calendarTokens.todayText : colors.textSecondary },
            ]}
          >
            Hoy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleTheme}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          style={[styles.iconBtn, { backgroundColor: surfaceBg, marginLeft: 6 }]}
        >
          <Feather name={isDarkMode ? 'sun' : 'moon'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Row 2: Nav arrows + view mode toggle */}
      <View style={styles.row2}>
        <View style={styles.navGroup}>
          <TouchableOpacity
            onPress={() => onNavigate(-1)}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Período anterior"
            style={[styles.navBtn, { backgroundColor: surfaceBg, borderColor }]}
          >
            <Feather name="chevron-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onNavigate(1)}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Período siguiente"
            style={[styles.navBtn, { backgroundColor: surfaceBg, borderColor, marginLeft: 4 }]}
          >
            <Feather name="chevron-right" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* View mode selector */}
        <View style={[styles.viewSelector, { backgroundColor: surfaceBg, borderColor }]}>
          {VIEW_MODES.map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => onChangeViewMode(m)}
              accessibilityRole="button"
              accessibilityLabel={`Vista ${VIEW_LABELS[m]}`}
              style={[
                styles.viewBtn,
                viewMode === m && { backgroundColor: calendarTokens.todayBg },
              ]}
            >
              <Text
                style={[
                  styles.viewBtnText,
                  {
                    color: viewMode === m ? calendarTokens.todayText : colors.textSecondary,
                    fontWeight: viewMode === m ? '600' : '400',
                  },
                ]}
              >
                {VIEW_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: calendarTokens.dateLabelSize,
    fontWeight: calendarTokens.dateLabelWeight,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSelector: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 2,
    overflow: 'hidden',
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewBtnText: {
    fontSize: 12,
  },
});
