import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const GYM_KEYWORDS = ['gimnasio', 'fitness'];

// Retorna true si el negocio del usuario pertenece a la categoría gimnasio/fitness.
// El AuthContext ya carga category_name al iniciar sesión, por lo que este hook es síncrono.
export function useIsGym(): boolean {
  const { business } = useAuth();

  return useMemo(() => {
    if (!business?.category_name) return false;
    const lower = business.category_name.toLowerCase();
    return GYM_KEYWORDS.some(kw => lower.includes(kw));
  }, [business?.category_name]);
}
