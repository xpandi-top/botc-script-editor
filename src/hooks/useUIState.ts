import { useState } from 'react'
import type { ConsoleSection } from '../components/StorytellerSub/types'

export function useUIState() {
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [activeRightPopup, setActiveRightPopup] = useState<'log' | 'settings' | null>(null)
  const [showScriptPanel, setShowScriptPanel] = useState(false)
  const [tagPopoutSeat, setTagPopoutSeat] = useState<number | null>(null)
  const [skillPopoutSeat, setSkillPopoutSeat] = useState<number | null>(null)
  const [skillRoleDropdownOpen, setSkillRoleDropdownOpen] = useState(false)
  const [showNominationSheet, setShowNominationSheet] = useState(false)
  const [showEditPlayersModal, setShowEditPlayersModal] = useState(false)
  const [editPlayersPreset, setEditPlayersPreset] = useState('')
  const [loadTagsPreset, setLoadTagsPreset] = useState('')
  const [activeConsoleSections, setActiveConsoleSections] = useState<Set<ConsoleSection>>(
    new Set(['day']),
  )

  function toggleConsoleSection(section: ConsoleSection) {
    setActiveConsoleSections((cur) => {
      const next = new Set(cur)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return {
    showLogPanel, setShowLogPanel,
    showRightPanel, setShowRightPanel,
    activeRightPopup, setActiveRightPopup,
    showScriptPanel, setShowScriptPanel,
    tagPopoutSeat, setTagPopoutSeat,
    skillPopoutSeat, setSkillPopoutSeat,
    skillRoleDropdownOpen, setSkillRoleDropdownOpen,
    showNominationSheet, setShowNominationSheet,
    showEditPlayersModal, setShowEditPlayersModal,
    editPlayersPreset, setEditPlayersPreset,
    loadTagsPreset, setLoadTagsPreset,
    activeConsoleSections, setActiveConsoleSections,
    toggleConsoleSection,
  }
}
