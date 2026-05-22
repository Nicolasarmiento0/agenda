import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const DEFAULT_SERVICES = [
  { id: 'p1', name: 'Servicio 1', price: 0 },
  { id: 'p2', name: 'Servicio 2', price: 0 },
  { id: 'p3', name: 'Servicio 3', price: 0 },
];

const GYM_SERVICES = [
  { id: 'g1', name: 'CLASE', price: 0 },
  { id: 'g2', name: 'Taller Extraprogramático', price: 0 },
  { id: 'g3', name: 'Evaluación', price: 0 },
];

export function useServices(businessId: string, isGym: boolean, visible: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !businessId) return;

    if (isGym) {
      setServices(GYM_SERVICES);
      return;
    }

    let isMounted = true;
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data: bizServices, error: bizError } = await supabase
          .from('business_services')
          .select('name, price')
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (!bizError && bizServices && bizServices.length > 0) {
          if (isMounted) setServices(bizServices);
          return;
        }

        const { data: bizData } = await supabase
          .from('businesses')
          .select('category_id')
          .eq('id', businessId)
          .single();

        if (bizData?.category_id) {
          const { data: catServices } = await supabase
            .from('catalog_services')
            .select('name')
            .eq('category_id', bizData.category_id);

          if (catServices && catServices.length > 0) {
            if (isMounted) {
              setServices(catServices.map((s: { name: string }) => ({ id: s.name, name: s.name, price: 0 })));
            }
            return;
          }
        }

        if (isMounted) setServices(DEFAULT_SERVICES);
      } catch {
        if (isMounted) setServices(DEFAULT_SERVICES);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, [visible, businessId, isGym]);

  return { services, loading };
}
