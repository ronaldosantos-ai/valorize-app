import { create } from 'zustand';
import { User, CostConfig, Service, Appointment, MonthlySummary } from '../types';

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Cost config
  costConfig: CostConfig | null;
  setCostConfig: (config: CostConfig) => void;

  // Services
  services: Service[];
  setServices: (services: Service[]) => void;
  addService: (service: Service) => void;

  // Appointments
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;

  // Monthly summary
  summary: MonthlySummary | null;
  setSummary: (summary: MonthlySummary) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  costConfig: null,
  setCostConfig: (costConfig) => set({ costConfig }),

  services: [],
  setServices: (services) => set({ services }),
  addService: (service) =>
    set((state) => ({ services: [service, ...state.services] })),

  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) =>
    set((state) => ({ appointments: [appointment, ...state.appointments] })),

  summary: null,
  setSummary: (summary) => set({ summary }),
}));
