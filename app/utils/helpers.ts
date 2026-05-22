export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 12) {
    return 'Buenos días,';
  } else if (hour >= 12 && hour < 20) {
    return 'Buenas tardes,';
  } else {
    return 'Buenas noches,';
  }
}

export type UnavailableBlock = {
  start: number;
  duration: number;
  title: string;
};

export function getUnavailableBlocks(
  date: Date,
  business: any,
  worker: any,
  gridStartHour: number,
  gridEndHour: number
): UnavailableBlock[] {
  const dayId = date.getDay() === 0 ? '7' : String(date.getDay());
  const blocks: UnavailableBlock[] = [];

  const toDecimal = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  // 1. Business Schedule Gaps
  if (business?.schedule) {
    const dayBlocks = business.schedule[dayId] || [];
    if (dayBlocks.length === 0) {
      // Completamente cerrado
      blocks.push({ start: gridStartHour, duration: gridEndHour - gridStartHour, title: 'No disponible' });
    } else {
      const sorted = [...dayBlocks].map(b => ({
        start: toDecimal(b.start),
        end: toDecimal(b.end)
      })).sort((a, b) => a.start - b.start);

      let current = gridStartHour;
      for (const b of sorted) {
        if (b.start > current) {
          blocks.push({ start: current, duration: b.start - current, title: 'No disponible' });
        }
        current = Math.max(current, b.end);
      }
      if (current < gridEndHour) {
        blocks.push({ start: current, duration: gridEndHour - current, title: 'No disponible' });
      }
    }
  }

  // 2. Worker Blocks
  if (worker?.blocks) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    for (const wb of worker.blocks) {
      if ((wb.type === 'recurring' && String(wb.dayOfWeek) === dayId) || 
          (wb.type === 'specific' && wb.date === dateStr)) {
        const start = toDecimal(wb.start);
        const end = toDecimal(wb.end);
        blocks.push({ start, duration: end - start, title: wb.title || 'Bloqueado' });
      }
    }
  }

  return blocks;
}
