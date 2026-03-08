import { useParams } from 'react-router-dom'

export default function Film() {
  const { id } = useParams()

  return (
    <div>
      <h1>Film {id}</h1>
    </div>
  )
}
