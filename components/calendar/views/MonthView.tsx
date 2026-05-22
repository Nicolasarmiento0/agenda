import React, { useMemo } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPastelColors } from '../../../constants/appointments';
import { isToday, shortDayName, toLocalISOString } from '../../calendar/modals/agendaHelpers';
import { calendarTokens } from '../calendarTokens';
import { Appointment } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = Math.floor(SCREEN_WIDTH / 7);
const DAY_ABBREVS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface MonthViewProps {
  /** 42 días (grid 6×7, comienza el lunes) */
  gridDays: Date[];
  selectedMonth: number;
  selectedYear: number;
  appointments: Appointment[];
  isDarkMode: boolean;
  colors: { textPrimary: string; textSecondary: string; border: string; primary: string };
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onDayPress: (date: Date) => void;
}

export function MonthView({
  gridDays, selectedMonth, selectedYear,
  appointments, isDarkMode, colors,
  refreshing, onRefresh, onDayPress,
}: MonthViewProps) {
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (!a.date) continue;
      (map[a.date] ||= []).push(a);
    }
    return map;
  }, [appointments]);

  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(gridDays.slice(i * 7, i * 7 + 7));
    }
    return rows;
  }, [gridDays]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Day abbreviation header */}
      <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
        {DAY_ABBREVS.map(d => (
          <Text key={d} style={[styles.headerCell, { color: colors.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <View
          key={wi}
          style={[styles.weekRow, { borderBottomColor: borderColor }]}
        >
          {week.map((day, di) => {
            const dateStr = toLocalISOString(day);
            const inMonth = day.getMonth() === selectedMonth && day.getFullYear() === selectedYear;
            const today = isToday(day);
            const dayAppts = byDate[dateStr] ?? [];
            const visible = dayAppts.slice(0, calendarTokens.monthMaxChipsPerCell);
            const overflow = dayAppts.length - visible.length;

            return (
              <TouchableOpacity
                key={di}
                onPress={() => onDayPress(day)}
                accessibilityRole="button"
                accessibilityLabel={`${day.getDate()} de mes${dayAppts.length > 0 ? `, ${dayAppts.length} citas` : ''}`}
                style={[styles.cell, { borderLeftColor: borderColor, borderLeftWidth: di > 0 ? 0.5 : 0 }]}
              >
                {/* Day number */}
                <View style={[styles.dayNumWrap, today && { backgroundColor: calendarTokens.todayBg }]}>
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: today
                          ? calendarTokens.todayText
                          : inMonth ? colors.textPrimary : colors.textSecondary,
                        fontWeight: today ? '700' : inMonth ? '500' : '300',
                        opacity: inMonth ? 1 : 0.4,
                      },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>

                {/* Event chips */}
                <View style={styles.chips}>
                  {visible.map(appt => {
                    const c = getPastelColors(appt.id, isDarkMode);
                    return (
                      <View
                        key={appt.id}
                        style={[
                          styles.chip,
                          { backgroundColor: c.bg, borderColor: c.border },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: isDarkMode ? '#fff' : '#1a1a2e' }]}
                          numberOfLines={1}
                        >
                          {appt.service}
                        </Text>
                      </View>
                    );
                  })}
                  {overflow > 0 && (
                    <Text style={[styles.overflow, { color: colors.textSecondary }]}>
                      +{overflow} más
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  headerCell: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    width: CELL_WIDTH,
    minHeight: calendarTokens.monthCellMinHeight,
    paddingTop: 6,
    paddingHorizontal: 3,
    paddingBottom: 4,
  },
  dayNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  dayNum: {
    fontSize: 13,
    textAlign: 'center',
  },
  chips: {
    gap: 2,
  },
  chip: {
    height: calendarTokens.monthEventChipHeight,
    borderRadius: calendarTokens.monthEventChipRadius,
    borderWidth: 0.5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  overflow: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
});
