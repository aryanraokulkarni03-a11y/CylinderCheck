export default function ProjectShutdownPage() {
  return (
    <main className="shutdown-page" aria-labelledby="shutdown-title">
      <div className="shutdown-page__shell">
        <p className="shutdown-page__eyebrow overline">Project Archived</p>
        <h1 id="shutdown-title" className="shutdown-page__title">
          CylinderCheck has been discontinued
        </h1>

        <div className="shutdown-page__body">
          <p className="shutdown-page__lead">
            CylinderCheck was built out of a real belief that LPG uncertainty, booking pressure, and
            local supply anxiety deserved better visibility and better tools.
          </p>
          <p>
            This project carried a much bigger vision than what was visible on the surface. It came
            with a lot of care, a lot of effort, and more sleepless nights than most people will
            ever know. It was built with the hope of creating something genuinely useful, grounded,
            and meaningful.
          </p>
          <p>
            For now, that journey is coming to an end.
          </p>
          <p>
            CylinderCheck is no longer active and is not being maintained or operated anymore.
          </p>
          <p>
            Thank you to everyone who supported the project, spent time with it, believed in it, or
            simply gave it a chance.
          </p>
        </div>

        <p className="shutdown-page__signature">Team Xisch</p>
      </div>
    </main>
  )
}
