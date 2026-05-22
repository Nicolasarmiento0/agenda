import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Sidebar from '../Sidebar';
import { calendarTokens } from './calendarTokens';
import { MiniCalendar } from './MiniCalendar';
import { Appointment } from './types';

const IS_TABLET = Dimensions.get('window').width >= 768;

interface CalendarSidebarProps {
  visible: boolean;
  selectedDate: Date;
  appointments: Appointment[];
  isDarkMode: boolean;
  colors: { textPrimary: string; textSecondary: string; border: string; primary: string; background: string };
  onClose: () => void;
  onSelectDate: (d: Date) => void;
  onNavigateMonth: (delta: number) => void;
}

export function CalendarSidebar({
  visible, selectedDate, appointments, isDarkMode, colors,
  onClose, onSelectDate, onNavigateMonth,
}: CalendarSidebarProps) {
  return (
    <>
      {/* Sidebar estándar (modal drawer en mobile y tablet) */}
      <Sidebar visible={visible} onClose={onClose} />

      {/* Tablet: panel fijo izquierdo con mini-calendario */}
      {IS_TABLET && (
        <View
          style={[
            styles.fixedPanel,
            {
              backgroundColor: isDarkMode ? 'rgba(15,18,24,0.95)' : 'rgba(248,248,252,0.95)',
              borderRightColor: colors.border,
            },
          ]}
        >
          <MiniCalendar
            selectedDate={selectedDate}
            appointments={appointments}
            isDarkMode={isDarkMode}
            colors={colors}
            onSelectDate={onSelectDate}
            onNavigateMonth={onNavigateMonth}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fixedPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: calendarTokens.sidebarWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
});
