import { useState } from 'react'
import type { ConsoleSection, ExportConfig } from '../components/StorytellerSub/types'

export function useUIState() {
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [activeRightPopup, setActiveRightPopup] = useState<'log' | 'settings' | null>(null)
  const [showScriptPanel, setShowScriptPanel] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  /** null = auto-detect from window orientation; true/false = manual lock */
  const [portraitOverride, setPortraitOverride] = useState<boolean | null>(null)
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
  // Phase 4B: audio
  const [alarmActive, setAlarmActive] = useState(false)
  const [bgmVolume, setBgmVolume] = useState(0.7)
  // Phase 4C: selective export
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeSeats: true,
    includeVotes: true,
    includeSkills: true,
    includeEvents: false,
    includeStNotes: false,
    dayFilter: 'all',
  })
  const [nightShowCharacter, setNightShowCharacter] = useState(false)
  const [nightShowWakeOrder, setNightShowWakeOrder] = useState(false)
  const [characterPopoutSeat, setCharacterPopoutSeat] = useState<number | null>(null)

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
    showInfoPanel, setShowInfoPanel,
    portraitOverride, setPortraitOverride,
    tagPopoutSeat, setTagPopoutSeat,
    skillPopoutSeat, setSkillPopoutSeat,
    skillRoleDropdownOpen, setSkillRoleDropdownOpen,
    showNominationSheet, setShowNominationSheet,
    showEditPlayersModal, setShowEditPlayersModal,
    editPlayersPreset, setEditPlayersPreset,
    loadTagsPreset, setLoadTagsPreset,
    activeConsoleSections, setActiveConsoleSections,
    toggleConsoleSection,
    alarmActive, setAlarmActive,
    bgmVolume, setBgmVolume,
    showExportModal, setShowExportModal,
    exportConfig, setExportConfig,
    nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder,
    characterPopoutSeat, setCharacterPopoutSeat,
  }
}
