import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SelectedBusiness = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  avatar_url?: string;
  status: string;
  category_id?: string;
  opening_time?: string;
  closing_time?: string;
  maps_url?: string;
  instagram_url?: string;
  booking_window_day?: number;
  booking_window_open_time?: string;
  booking_window_close_time?: string;
  photos?: string[];
  slug?: string;
};

type BusinessContextType = {
  selectedBusiness: SelectedBusiness | null;
  setSelectedBusiness: (b: SelectedBusiness | null) => void;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusiness, setSelectedBusiness] = useState<SelectedBusiness | null>(null);

  return (
    <BusinessContext.Provider value={{ selectedBusiness, setSelectedBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within a BusinessProvider');
  return context;
}
