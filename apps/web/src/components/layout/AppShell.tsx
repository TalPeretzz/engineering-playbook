"use client";

import React, { useState, useCallback } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { LanguageProvider } from "@/hooks/useLanguage";
import { allTopics } from "@engineering-playbook/content";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <LanguageProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar totalTopics={allTopics.length} onSidebarToggle={toggleSidebar} />
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}

          <Sidebar topics={allTopics} isOpen={sidebarOpen} onClose={closeSidebar} />

          <main className="flex-1 overflow-y-auto bg-surface">
            <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
