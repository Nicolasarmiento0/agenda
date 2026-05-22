/** Design tokens inspirados en Apple Calendar. Dark-first. */
export const calendarTokens = {
  // ─── Grid lines ────────────────────────────────────────────
  gridLineColorDark:       'rgba(255,255,255,0.06)',
  gridHalfLineColorDark:   'rgba(255,255,255,0.03)',
  gridLineColorLight:      'rgba(0,0,0,0.06)',
  gridHalfLineColorLight:  'rgba(0,0,0,0.03)',

  // ─── Column separator ──────────────────────────────────────
  colSeparatorDark:  'rgba(255,255,255,0.06)',
  colSeparatorLight: 'rgba(0,0,0,0.06)',

  // ─── Event cards (Apple style: no borde izquierdo) ─────────
  eventCardRadius:   7,
  eventCardPaddingH: 6,
  eventCardPaddingV: 5,
  eventMinHeight:    28,

  // ─── Header typography ─────────────────────────────────────
  /** Rango semana/mes en el header */
  dateLabelSize:    17,
  dateLabelWeight:  '600' as const,
  /** Número de día grande (day view) */
  dayOfMonthSize:   34,
  dayOfMonthWeight: '300' as const,
  /** Día de semana abreviado (Lun, Mar…) */
  weekDayLabelSize:   11,
  weekDayLabelWeight: '500' as const,
  /** Etiquetas de hora en el grid */
  hourLabelSize: 11,

  // ─── Today indicator ───────────────────────────────────────
  todayCircleSize: 28,
  todayBg:         '#B4F736',
  todayText:       '#111827',

  // ─── Now line ──────────────────────────────────────────────
  nowLineHeight: 1.5,
  nowDotSize:    8,
  nowColor:      '#B4F736',

  // ─── Sidebar / mini-calendar ───────────────────────────────
  miniCalDaySize:   28,
  miniCalDotSize:   4,
  miniCalDotGap:    2,
  sidebarWidth:     240,

  // ─── Month view ────────────────────────────────────────────
  monthCellMinHeight:    80,
  monthEventChipHeight:  16,
  monthEventChipRadius:  4,
  monthMaxChipsPerCell:  3,

  // ─── Unavailable blocks ────────────────────────────────────
  unavailBgDark:    'rgba(255,255,255,0.03)',
  unavailBgLight:   'rgba(0,0,0,0.03)',
  unavailBorderDark:  'rgba(255,255,255,0.08)',
  unavailBorderLight: 'rgba(0,0,0,0.08)',
  unavailRadius:    10,

  // ─── Ghost slot ────────────────────────────────────────────
  ghostBorderDark:  'rgba(180,247,54,0.5)',
  ghostBorderLight: 'rgba(50,150,0,0.4)',
  ghostBgDark:      'rgba(180,247,54,0.08)',
  ghostBgLight:     'rgba(50,150,0,0.06)',
  ghostRadius:      7,

  // ─── FAB ───────────────────────────────────────────────────
  fabSize:   52,
  fabRadius: 26,
} as const;
