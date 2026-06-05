import { Platform } from 'react-native';

/**
 * Convierte un arreglo de objetos JSON en formato CSV, manejando escaping
 * y agregando el BOM UTF-8 para compatibilidad óptima con Excel/Google Sheets.
 */
export function convertToCSV(data: any[], headers: { label: string; key: string }[]): string {
  const BOM = '\uFEFF'; // UTF-8 Byte Order Mark para compatibilidad con caracteres en español en Excel
  
  const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
  
  const rows = data.map(item => {
    return headers.map(h => {
      let val = item[h.key];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'object') {
        // En caso de que sea un objeto anidado (ej: workers.name)
        val = val.name || val.nickname || JSON.stringify(val);
      } else {
        val = String(val);
      }
      // Escapa comillas dobles internas
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return BOM + [headerRow, ...rows].join('\n');
}

interface ExportOptions {
  data: any[];
  headers: { label: string; key: string }[];
  filename: string;
}

/**
 * Exporta los datos recibidos a un archivo CSV.
 * En ambiente Web descarga el archivo automáticamente a través del navegador.
 * En iOS y Android genera un archivo temporal y abre el menú nativo de exportación (Share Sheet).
 * Utiliza require dinámico con manejo seguro de excepciones (try/catch) y resolución de exportaciones ESM/CJS (default).
 */
export async function exportToCSV({ data, headers, filename }: ExportOptions): Promise<void> {
  if (!data || data.length === 0) {
    throw new Error('No hay datos disponibles para exportar');
  }

  const csvContent = convertToCSV(data, headers);

  if (Platform.OS === 'web') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // 1. Carga segura del módulo FileSystem
    let FileSystemModule: any = null;
    try {
      FileSystemModule = require('expo-file-system/legacy');
    } catch (e) {
      console.warn('[csvExporter] Error al requerir expo-file-system:', e);
    }
    const FileSystem = FileSystemModule?.default || FileSystemModule;

    if (!FileSystem || !FileSystem.writeAsStringAsync) {
      throw new Error('El sistema de archivos local (expo-file-system) no está disponible en este dispositivo. Asegúrate de compilar el binario nativo.');
    }

    // 2. Carga segura del módulo Sharing
    let SharingModule: any = null;
    try {
      SharingModule = require('expo-sharing');
    } catch (e) {
      console.warn('[csvExporter] Error al requerir expo-sharing:', e);
    }
    const Sharing = SharingModule?.default || SharingModule;

    if (!Sharing || typeof Sharing.isAvailableAsync !== 'function') {
      throw new Error('El módulo nativo para compartir (expo-sharing) no está enlazado en este compilado local. Por favor reconstruye tu dev-client usando npx expo run:ios o run:android.');
    }

    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    
    // Escribimos el archivo en el caché temporal del dispositivo
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Compartimos el archivo con el Share Sheet nativo
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Historial de Ingresos',
        UTI: 'public.comma-separated-values-text', // Identificador de tipo uniforme para CSV
      });
    } else {
      throw new Error('El menú para compartir no está disponible en este dispositivo');
    }
  }
}
