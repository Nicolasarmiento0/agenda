import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isToday, toLocalISOString } from '../calendar/modals/agendaHelpers';
import { calendarTokens } from './calendarTokens';
import { Appointment } from './types';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_ABBREVS = ['L','M','X','J','V','S','D'];

interface MiniCalendarProps {
  selectedDate: Date;
  appointments: Appointment[];
  isDarkMode: boolean;
  colors: { textPrimary: string; textSecondary: string; border: string; primary: string };
  onSelectDate: (d: Date) => void;
  onNavigateMonth: (delta: number) => void;
}

export function MiniCalendar({ selectedDate, appointments, isDarkMode, colors, onSelectDate, onNavigateMonth }: MiniCalendarProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const selectedStr = toLocalISOString(selectedDate);

  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(1 - (startDay === 0 ? 6 : startDay - 1));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [year, month]);

  const datesWithAppts = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) { if (a.date) set.add(a.date); }
    return set;
  }, [appointments]);

  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => onNavigateMonth(-1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Text style={[styles.navArrow, { color: colors.textSecondary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {MONTHS_ES[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={() => onNavigateMonth(1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Text style={[styles.navArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day abbrevs */}
      <View style={styles.abbrevRow}>
        {DAY_ABBREVS.map(a => (
          <Text key={a} style={[styles.abbrev, { color: colors.textSecondary }]}>{a}</Text>
        ))}
      </View>

      {/* Days grid — 6 weeks */}
      {Array.from({ length: 6 }, (_, wi) => (
        <View key={wi} style={styles.weekRow}>
          {gridDays.slice(wi * 7, wi * 7 + 7).map((d, di) => {
            const str = toLocalISOString(d);
            const inMonth = d.getMonth() === month;
            const today = isToday(d);
            const isSelected = str === selectedStr;
            const hasDot = datesWithAppts.has(str) && inMonth;

            return (
              <TouchableOpacity
                key={di}
                onPress={() => onSelectDate(d)}
                accessibilityRole="button"
                accessibilityLabel={`Día ${d.getDate()}`}
                style={styles.dayCell}
              >
                <View style={[
                  styles.dayCircle,
                  today && !isSelected && { borderWidth: 1, borderColor: calendarTokens.todayBg },
                  isSelected && { backgroundColor: calendarTokens.todayBg },
                ]}>
                  <Text style={[
                    styles.dayNum,
                    {
                      color: isSelected ? calendarTokens.todayText :
                             today ? calendarTokens.todayBg :
                             inMonth ? colors.textPrimary : colors.textSecondary,
                      opacity: inMonth ? 1 : 0.35,
                      fontWeight: today || isSelected ? '700' : '400',
                    },
                  ]}>
                    {d.getDate()}
                  </Text>
                </View>
                {hasDot && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? calendarTokens.todayText : calendarTokens.todayBg }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = Math.floor((calendarTokens.sidebarWidth - 24) / 7);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navArrow: {
    fontSize: 20,
    fontWeight: '400',
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  abbrevRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  abbrev: {
    width: CELL,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 11,
  },
  dot: {
    position: 'absolute',
    bottom: 1,
    width: calendarTokens.miniCalDotSize,
    height: calendarTokens.miniCalDotSize,
    borderRadius: calendarTokens.miniCalDotSize / 2,
  },
});
