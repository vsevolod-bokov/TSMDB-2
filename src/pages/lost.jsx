import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Lost() {
  useEffect(() => { document.title = 'Not Found - TSMDB'; }, []);
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <Link to="/">Go Home</Link>
    </div>
  )
}
