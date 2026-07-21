"use client";

import { createContext, useContext, useState, useCallback } from "react";

const OnboardingContext = createContext(null);

const TOTAL_DATA_STEPS = 5;

const initialState = {
  orgName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  socialMedia: "",
  festivalDuration: "",
  festivalType: [],
  inspiration: "",
  communityImpact: "",
  goals: "",
  challenges: [],
  solveOneProblem: "",
  heardOfSpf: "",
  hopeToAccomplish: "",
  marketingTool: "",
  desiredFeatures: "",
};

export function OnboardingProvider({ children }) {
  const [answers, setAnswers] = useState(initialState);
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);

  const setAnswer = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayItem = useCallback((key, item) => {
    setAnswers((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(item)
          ? arr.filter((v) => v !== item)
          : [...arr, item],
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= TOTAL_DATA_STEPS + 1) {
        setComplete(true);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skip = useCallback(() => {
    setComplete(true);
  }, []);

  const start = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const retake = useCallback(() => {
    setAnswers(initialState);
    setCurrentStep(0);
    setComplete(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        answers,
        currentStep,
        complete,
        totalSteps: TOTAL_DATA_STEPS,
        setAnswer,
        toggleArrayItem,
        nextStep,
        prevStep,
        skip,
        start,
        retake,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
