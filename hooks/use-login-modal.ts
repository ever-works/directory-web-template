"use client";

import { create } from "zustand";

export interface LoginModalStore {
  isOpen: boolean;
  message: string | undefined;
  callbackUrl: string | undefined;
  onOpen: (message?: string, callbackUrl?: string) => void;
  onClose: () => void;
}

export const useLoginModal = create<LoginModalStore>()((set) => ({
  isOpen: false,
  message: undefined,
  callbackUrl: undefined,
  onOpen: (message, callbackUrl) => set({ isOpen: true, message, callbackUrl }),
  onClose: () => set({ isOpen: false, message: undefined, callbackUrl: undefined }),
}));

export type LoginModalReturn = ReturnType<typeof useLoginModal>; 