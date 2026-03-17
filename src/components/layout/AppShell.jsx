import React from 'react'

export default function AppShell({ sidebar, topbar, bottomNav, footer, children }) {
  const hasSidebar = !!sidebar

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
      {sidebar}

      <div className={`min-h-[100dvh] flex flex-col ${hasSidebar ? 'md:pl-[var(--sidebar-width)]' : ''}`}>
        {topbar}

        <main
          id="main-content"
          className="flex-1 w-full pb-[calc(var(--bottomnav-height)+16px+env(safe-area-inset-bottom))] md:pb-10"
        >
          <div className="mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6 md:px-8 py-6">
            {children}
            {footer}
          </div>
        </main>
      </div>

      {bottomNav}
    </div>
  )
}
