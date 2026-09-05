import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl" aria-hidden="true">🌊</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">
        That page does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-ink hover:bg-primary-hover"
      >
        Back to the overview
      </Link>
    </div>
  )
}
