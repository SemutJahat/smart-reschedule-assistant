import { create } from "zustand";

export type ModalType =
  | "package-form"
  | "service-form"
  | "member-form"
  | "confirm"
  | "coach-form"
  | "schedule-form"
  | "reschedule-chat";

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  props: any;

  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  type: null,
  props: {},

  openModal: (type, props = {}) => set({ isOpen: true, type, props }),
  closeModal: () => set({ isOpen: false, type: null, props: {} }),
}));
