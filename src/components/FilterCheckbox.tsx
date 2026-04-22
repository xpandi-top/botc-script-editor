import { Chip } from '@mui/material'

type FilterCheckboxProps = {
  checked: boolean
  label: string
  onChange: () => void
}

export function FilterCheckbox({ checked, label, onChange }: FilterCheckboxProps) {
  return (
    <Chip
      label={label}
      onClick={onChange}
      color={checked ? 'primary' : 'default'}
      variant={checked ? 'filled' : 'outlined'}
      sx={{
        borderRadius: 999,
        cursor: 'pointer',
        '& .MuiChip-label': { px: 1.5 },
      }}
    />
  )
}