Actúa como mi Desarrollador Senior y experto en UI/UX. Necesito que actualices el sistema de diseño global de mi proyecto en el repositorio https://github.com/Nicolasarmiento0/agenda.

Vamos a implementar una paleta de colores definitiva basada en el estilo "Tesla" y "Liquid Glass", afectando a todos los componentes, pantallas y navegación (Expo Router).

Por favor, aplica los siguientes cambios de manera global:

Configuración de la Paleta de Colores:

Modo Claro: Fondo principal #F4F5F7, Superficies/Tarjetas #FFFFFF, Texto Principal #111827, Texto Secundario #6B7280.

Modo Oscuro: Fondo principal #0B0E14, Superficies/Tarjetas rgba(255, 255, 255, 0.05), Texto Principal #F9FAFB, Texto Secundario #9CA3AF.

Color de Acento Global (Ambos modos): #B4F736 (Úsalo para botones principales, indicadores de estado activo y llamadas a la acción).

Implementación de Liquid Glass:

Utiliza la librería expo-blur en todos los contenedores de tarjetas, modales y barras de navegación flotantes.

En el Modo Oscuro, el tint del desenfoque debe combinarse con el fondo rgba(255, 255, 255, 0.05) para lograr una profundidad premium.

Geometría y Tipografía:

Aplica un borderRadius sutil de 16px a 24px en todos los botones y tarjetas.

Asegúrate de que toda la app esté utilizando la fuente sans-serif "Inter".

Elimina cualquier sombra pesada o líneas de división muy marcadas; prioriza el espacio negativo.

Por favor, modifica los archivos de configuración de estilos (como tu ThemeProvider, o constantes de colores) y ajusta un par de componentes principales (como el Dashboard) para confirmar que el toggle de Modo Oscuro/Claro funciona perfectamente con esta nueva paleta. Entrégame el código de los archivos modificados.