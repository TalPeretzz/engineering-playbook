"use client";

import React from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { LanguageProvider } from "@/hooks/useLanguage";
import { allTopics } from "@engineering-playbook/content";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar totalTopics={allTopics.length} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar topics={allTopics} />
          <main className="flex-1 overflow-y-auto bg-surface">
            <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
