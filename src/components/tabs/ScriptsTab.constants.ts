import StarIcon from '@mui/icons-material/Star'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type React from 'react'

export type TagMeta = { en: string; zh: string; Icon: React.ElementType; color: string }

export const SCRIPT_TAGS = ['favorite', 'good', 'bad', 'excellent'] as const

export const BOTC_SCRIPT_FOLDERS_KEY = 'BOTC_SCRIPT_FOLDERS'

export const SCRIPT_TAG_META: Record<string, TagMeta> = {
  favorite:  { en: 'Favorite',  zh: '收藏', Icon: StarIcon,        color: '#f9a825' },
  good:      { en: 'Good',      zh: '好玩', Icon: ThumbUpIcon,     color: '#388e3c' },
  bad:       { en: 'Bad',       zh: '较差', Icon: ThumbDownIcon,   color: '#d32f2f' },
  excellent: { en: 'Excellent', zh: '优秀', Icon: AutoAwesomeIcon, color: '#7b1fa2' },
}
