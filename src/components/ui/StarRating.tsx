
interface StarRatingProps {
  label: string
  value: number | null
  onChange: (n: number) => void
}

export function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <div className="storyteller-survey__field">
      <label className="survey-label">{label}</label>
      <div className="storyteller-survey__rating">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            className={`rating-btn${value === num ? ' active' : ''}`}
            onClick={() => onChange(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  )
}
