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
import { HOUR_HEIGHT } from '../../../constants/appointments';
import { isToday, nowLinePosition, shortDayName, toLocalISOString } from '../../agenda/agendaHelpers';
import { calendarTokens } from '../calendarTokens';
import { NowLine } from '../grid/NowLine';
import { LABEL_WIDTH, TimeGrid } from '../grid/TimeGrid';
import { WorkerColumn } from '../grid/WorkerColumn';
import { Appointment, CalendarPermissions, GhostSlot, PressedSlotData, WorkerRow } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WeekViewProps {
  weekDays: Date[];
  workers: WorkerRow[];
  appointments: Appointment[];
  hoursGrid: number[];
  startHour: number;
  endHour: number;
  ghostSlot: GhostSlot | null;
  pressedSlotRef: React.MutableRefObject<PressedSlotData | null>;
  business: any;
  permissions: CalendarPermissions;
  selectedWorkerFilter: string | null;
  isDarkMode: boolean;
  colors: { border: string; textSecondary: string; textPrimary: string; primary: string };
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onGhostSlotChange: (g: GhostSlot | null) => void;
  onSlotPress: (data: PressedSlotData) => void;
  onAppointmentPress: (appt: Appointment) => void;
  onDayHeaderPress: (date: Date) => void;
  onDrop?: (apptId: string, newHour: number, workerId: string, date: string) => void;
}

export function WeekView({
  weekDays, workers, appointments, hoursGrid, startHour, endHour,
  ghostSlot, pressedSlotRef, business, permissions,
  selectedWorkerFilter, isDarkMode, colors, refreshing, onRefresh,
  onGhostSlotChange, onSlotPress, onAppointmentPress, onDayHeaderPress, onDrop,
}: WeekViewProps) {
  const colWidth = useMemo(
    () => Math.floor((SCREEN_WIDTH - LABEL_WIDTH) / 7),
    []
  );

  const totalGridWidth = colWidth * 7;
  const nowPos = nowLinePosition(startHour, endHour);

  // En week view usamos el primer worker del filtro (o el primero) para unavailable blocks
  const primaryWorker = useMemo(() => {
    if (selectedWorkerFilter) return workers.find(w => w.id === selectedWorkerFilter) ?? workers[0];
    return workers[0];
  }, [workers, selectedWorkerFilter]);

  const dayAppts = (dateStr: string) =>
    appointments.filter(
      a => a.date === dateStr && a.status !== 'completed' && a.status !== 'no-show' &&
      (!selectedWorkerFilter || a.worker_id === selectedWorkerFilter)
    );

  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const todayBg = isDarkMode ? 'rgba(180,247,54,0.06)' : 'rgba(100,200,0,0.05)';

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Day header */}
      <View style={[styles.dayHeader, { borderBottomColor: borderColor, paddingLeft: LABEL_WIDTH }]}>
        {weekDays.map((d, i) => {
          const today = isToday(d);
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onDayHeaderPress(d)}
              style={{ width: colWidth, alignItems: 'center', paddingVertical: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Ir al día ${d.getDate()}`}
            >
              <Text
                style={[
                  styles.dayAbbrev,
                  { color: today ? colors.primary : colors.textSecondary },
                ]}
              >
                {shortDayName(d)}
              </Text>
              <View
                style={[
                  styles.dayNumCircle,
                  today && { backgroundColor: calendarTokens.todayBg },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: today ? calendarTokens.todayText : colors.textPrimary },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TimeGrid hoursGrid={hoursGrid} isDarkMode={isDarkMode}>
        <View style={{ flexDirection: 'row', width: totalGridWidth }}>
          {weekDays.map((d, di) => {
            const dateStr = toLocalISOString(d);
            const today = isToday(d);
            return (
              <View
                key={di}
                style={[
                  styles.dayCol,
                  {
                    width: colWidth,
                    height: (endHour - startHour) * HOUR_HEIGHT,
                    borderLeftWidth: di > 0 ? 0.5 : 0,
                    borderLeftColor: borderColor,
                    backgroundColor: today ? todayBg : 'transparent',
                  },
                ]}
              >
                <WorkerColumn
                  worker={primaryWorker ?? (workers[0] || { id: '', name: '', color: '#999', initials: '', avatar_url: null, specialty: '' })}
                  date={d}
                  appointments={dayAppts(dateStr)}
                  ghostSlot={ghostSlot}
                  pressedSlotRef={pressedSlotRef}
                  business={business}
                  startHour={startHour}
                  endHour={endHour}
                  width={colWidth}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  canCreate={permissions.canCreate}
                  canDrag={permissions.canManageStatus}
                  isFirst={di === 0}
                  colKey={dateStr}
                  onGhostSlotChange={onGhostSlotChange}
                  onSlotPress={onSlotPress}
                  onAppointmentPress={onAppointmentPress}
                  onDrop={onDrop}
                />
              </View>
            );
          })}

          {nowPos !== null && (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: nowPos, width: totalGridWidth }}
            >
              <NowLine top={0} />
            </View>
          )}
        </View>
      </TimeGrid>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayAbbrev: {
    fontSize: calendarTokens.weekDayLabelSize,
    fontWeight: calendarTokens.weekDayLabelWeight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayNumCircle: {
    width: calendarTokens.todayCircleSize,
    height: calendarTokens.todayCircleSize,
    borderRadius: calendarTokens.todayCircleSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '500',
  },
  dayCol: {
    position: 'relative',
  },
});
