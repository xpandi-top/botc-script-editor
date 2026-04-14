// @ts-nocheck
import React from 'react'
import { CHARACTER_DISTRIBUTION } from './constants'

export function CompactToolbar({ ctx }: { ctx: any }) {
  const {
    activeScriptTitle, language, currentDay, aliveCount, totalCount,
    audioPlaying, setAudioPlaying, audioTracks, selectedAudioSrc, setSelectedAudioSrc,
    handleLocalFileChange, openNewGamePanel, openEndGamePanel, showRightPanel,
    setShowRightPanel, setShowEditPlayersModal, showScriptPanel, setShowScriptPanel,
    audioRef, text,
  } = ctx

  const nonTravelerCount = currentDay.seats.filter((s) => !s.isTraveler).length
  const dist = CHARACTER_DISTRIBUTION[nonTravelerCount]
  const travelerCount = currentDay.seats.filter((s) => s.isTraveler).length
  const currentTrack = audioTracks.find((t) => t.src === selectedAudioSrc)

  return (
    <div className="storyteller-compact-toolbar">
      <audio ref={audioRef} />

      {/* ── Left: counts + script + music ── */}
      <div className="storyteller-compact-toolbar__left">
        <div className="storyteller-player-counts">
          <span className="storyteller-player-counts__total">
            <strong>{aliveCount}/{totalCount}</strong>
            {travelerCount > 0 && <span className="storyteller-player-counts__travelers">+{travelerCount}{text.travelersCount}</span>}
          </span>
          {dist && (
            <span className="storyteller-player-counts__dist">
              <span className="dist-townsfolk">{dist.townsfolk}T</span>
              <span className="dist-outsider">{dist.outsider}O</span>
              <span className="dist-minion">{dist.minion}M</span>
              <span className="dist-demon">1D</span>
            </span>
          )}
        </div>

        {activeScriptTitle && (
          <button
            className={`storyteller-script-trigger${showScriptPanel ? ' storyteller-script-trigger--active' : ''}`}
            onClick={() => setShowScriptPanel((p) => !p)}
            type="button"
            title={language === 'zh' ? '查看剧本信息' : 'View script info'}
          >
            {activeScriptTitle}
          </button>
        )}

        {/* ── Minimalist music player ── */}
        <div className="storyteller-bgm-player">
          <button
            className="storyteller-bgm-player__play"
            onClick={() => setAudioPlaying((c) => !c)}
            title={audioPlaying ? text.pause : text.play}
            type="button"
          >
            {audioPlaying ? '⏸' : '▶'}
          </button>
          <select
            className="storyteller-bgm-player__select"
            onChange={(e) => setSelectedAudioSrc(e.target.value)}
            value={selectedAudioSrc}
            title={currentTrack?.name}
          >
            {audioTracks.map((t) => (
              <option key={t.src} value={t.src}>{t.name}</option>
            ))}
          </select>
          <label className="storyteller-bgm-player__add" title={text.loadLocalFile}>
            +
            <input type="file" accept=".mp3" onChange={handleLocalFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* ── Right: primary actions ── */}
      <div className="storyteller-compact-toolbar__right">
        <button className="print-button" onClick={openNewGamePanel} type="button">
          {text.newGame}
        </button>
        <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">
          {text.editPlayers}
        </button>
        <button className="secondary-button secondary-button--small" onClick={openEndGamePanel} type="button">
          {text.endGame}
        </button>
        <button
          className={`secondary-button secondary-button--small${showRightPanel ? ' tab-button--active' : ''}`}
          onClick={() => setShowRightPanel((c) => !c)}
          title={showRightPanel ? text.hidePanel : text.showPanel}
          type="button"
        >
          ☰
        </button>
      </div>
    </div>
  )
}
