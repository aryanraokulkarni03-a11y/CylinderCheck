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
          className="flex-1 w-full pb-[calc(var(--bottomnav-height)+8px+env(safe-area-inset-bottom))] md:pb-6"
        >
          <div className="content-frame py-6">
            {children}
          </div>
        </main>

        {footer ? (
          <div className="app-footer-shell">
            <div className="content-frame">
              {footer}
            </div>
          </div>
        ) : null}
      </div>

      {bottomNav}
    </div>
  )
}
