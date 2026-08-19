"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import * as store from "@/store/progressStore";

type LanguageContextValue = {
  language: ProgrammingLanguage;
  setLanguage: (lang: ProgrammingLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: start with "typescript" so server and client agree on first render
  const [language, setLanguageState] = useState<ProgrammingLanguage>("typescript");

  useEffect(() => {
    setLanguageState(store.getPreferredLanguage());
  }, []);

  const setLanguage = useCallback((lang: ProgrammingLanguage) => {
    store.setPreferredLanguage(lang);
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
