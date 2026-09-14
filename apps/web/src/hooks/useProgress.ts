"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import * as store from "@/store/progressStore";

const DEFAULT_TOPIC_PROGRESS: TopicProgress = { status: "not-started", completedChallenges: [] };

export function useTopicProgress(slug: string) {
  // Start with SSR-safe default; read real value after mount to avoid hydration mismatch
  const [progress, setProgress] = useState<TopicProgress>(DEFAULT_TOPIC_PROGRESS);

  const refresh = useCallback(() => {
    setProgress(store.getTopicProgress(slug));
  }, [slug]);

  useEffect(() => {
    refresh();
    // Same-tab writes (this component's own or another's) don't touch localStorage's
    // `storage` event — subscribe so e.g. completing a challenge elsewhere on the page
    // updates this topic's progress without a navigation/remount.
    return store.subscribeToProgress(refresh);
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
  // Start with SSR-safe default
  const [language, setLanguageState] = useState<ProgrammingLanguage>("typescript");

  useEffect(() => {
    const refresh = () => setLanguageState(store.getPreferredLanguage());
    refresh();
    return store.subscribeToProgress(refresh);
  }, []);

  const setLanguage = useCallback((lang: ProgrammingLanguage) => {
    store.setPreferredLanguage(lang);
    setLanguageState(lang);
  }, []);

  return { language, setLanguage };
}

export function useOverallProgress(totalTopics: number) {
  // Start with 0 so server and client agree on initial render
  const [stats, setStats] = useState({ completed: 0, total: totalTopics, percent: 0 });

  useEffect(() => {
    const refresh = () => setStats(store.getOverallProgress(totalTopics));
    refresh();
    // storage event: cross-tab. subscribeToProgress: same-tab.
    window.addEventListener("storage", refresh);
    const unsubscribe = store.subscribeToProgress(refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      unsubscribe();
    };
  }, [totalTopics]);

  return stats;
}
