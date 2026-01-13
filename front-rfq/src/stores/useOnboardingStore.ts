import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
    hasCompletedTour: boolean;
    currentStep: number;
    isRunning: boolean;

    // Actions
    startTour: () => void;
    stopTour: () => void;
    completeTour: () => void;
    resetTour: () => void;
    setStep: (step: number) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            hasCompletedTour: false,
            currentStep: 0,
            isRunning: false,

            startTour: () => set({ isRunning: true, currentStep: 0 }),

            stopTour: () => set({ isRunning: false }),

            completeTour: () => set({
                hasCompletedTour: true,
                isRunning: false,
                currentStep: 0
            }),

            resetTour: () => set({
                hasCompletedTour: false,
                currentStep: 0,
                isRunning: false
            }),

            setStep: (step) => set({ currentStep: step }),
        }),
        {
            name: 'bideval-onboarding',
            partialize: (state) => ({
                hasCompletedTour: state.hasCompletedTour
            }),
        }
    )
);
