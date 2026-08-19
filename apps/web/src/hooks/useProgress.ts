"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import * as store from "@/store/progressStore";

export function useTopicProgress(slug: string) {
  const [progress, setProgress] = useState<TopicProgress>(() => store.getTopicProgress(slug));

  const refresh = useCallback(() => {
    setProgress(store.getTopicProgress(slug));
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completeChallenge = useCallback(
    (challengeId: string) => {
      store.completeChallenge(slug, challengeId);
      refresh();
    },
    [slug, refresh]
  );

  const completeTopic = useCallback(() => {
    store.completeTopic(slug);
    refresh();
  }, [slug, refresh]);

  const markInProgress = useCallback(() => {
    store.markTopicInProgress(slug);
    refresh();
  }, [slug, refresh]);

  return { progress, completeChallenge, completeTopic, markInProgress };
}

export function usePreferredLanguage() {
  const [language, setLanguageState] = useState<ProgrammingLanguage>(() =>
    store.getPreferredLanguage()
  );

  const setLanguage = useCallback((lang: ProgrammingLanguage) => {
    store.setPreferredLanguage(lang);
    setLanguageState(lang);
  }, []);

  return { language, setLanguage };
}

export function useOverallProgress(totalTopics: number) {
  const [stats, setStats] = useState(() => store.getOverallProgress(totalTopics));

  useEffect(() => {
    setStats(store.getOverallProgress(totalTopics));
    const handler = () => setStats(store.getOverallProgress(totalTopics));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [totalTopics]);

  return stats;
}
