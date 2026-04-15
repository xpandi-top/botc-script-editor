// @ts-nocheck
import React from 'react'

export function ArenaCenterRight({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay,
    aliveCount, totalCount, requiredVotes, effectiveRequiredVotes,
    leadingCandidates, nominatorsThisDay, nomineesThisDay,
    draftPassed, isVotingComplete, votingYesCount,
  } = ctx

  return (
    <div className="storyteller-center__right">
      {/* Game stats */}
      <div className="storyteller-center__game-stats">
        <span>{text.aliveCount}: <strong>{aliveCount}/{totalCount}</strong></span>
        <span>{text.requiredVotes}: <strong>{requiredVotes}</strong></span>
      </div>

      {/* Leading candidate(s) */}
      {leadingCandidates.length > 0 && (
        <div className="storyteller-center__leading">
          <span className="storyteller-center__leading-label">{text.leadingCandidate}</span>
          {leadingCandidates.map((c: any) => (
            <div className="storyteller-center__leading-row" key={c.seat}>
              <span className="storyteller-center__leading-name">#{c.seat} {c.name}</span>
              <span className="storyteller-center__leading-votes">{c.votes}<small>/{effectiveRequiredVotes}</small></span>
            </div>
          ))}
        </div>
      )}

      {/* Nomination status */}
      {currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' && (
        <p className="storyteller-center__status">
          {currentDay.voteDraft.actor
            ? `${text.actor}: #${currentDay.voteDraft.actor} → ${text.pickNominee}`
            : text.waitingForNomination}
        </p>
      )}

      {currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination' && (
        <div className="storyteller-center__vote-mini">
          <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
          <span className="storyteller-center__vote-count">
            {votingYesCount}<small>/{effectiveRequiredVotes}</small>
            {currentDay.voteDraft.isExile && <small> ⚑</small>}
          </span>
          {isVotingComplete && (
            <span className={draftPassed ? 'storyteller-pass' : 'storyteller-fail'}>
              {draftPassed ? text.pass : text.fail}
            </span>
          )}
        </div>
      )}

      {/* Today's nominations summary */}
      {nominatorsThisDay.length > 0 && (
        <div className="storyteller-center__summary">
          <span>{text.todayNominators}: {nominatorsThisDay.map((s: number) => `#${s}`).join(', ')}</span>
          <span>{text.todayNominees}: {nomineesThisDay.map((s: number) => `#${s}`).join(', ')}</span>
        </div>
      )}
    </div>
  )
}
