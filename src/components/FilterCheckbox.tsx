type FilterCheckboxProps = {
  checked: boolean
  label: string
  onChange: () => void
}

export function FilterCheckbox({ checked, label, onChange }: FilterCheckboxProps) {
  return (
    <label className="filter-chip">
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
