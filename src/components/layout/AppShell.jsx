import React from 'react';

export default function AppShell({ sidebar, topbar, bottomNav, children }) {
  return (
    <div className="flex min-h-[100dvh] w-full bg-bg-base relative text-text-primary overflow-x-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex flex-col w-[240px] fixed inset-y-0 left-0 bg-bg-raised border-r border-border z-40">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-full md:pl-[240px]">
        {/* Mobile Topbar */}
        <div className="md:hidden sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          {topbar}
        </div>

        {/* Content Viewport */}
        <main className="flex-1 w-full pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8">
          <div className="content-max w-full px-4 sm:px-6 md:px-8 py-6 mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]">
          {bottomNav}
        </div>
      </div>
    </div>
  );
}
