// @ts-nocheck
import React from 'react'
import { ModalsEditPlayers } from './ModalsEditPlayers'
import { ModalsNewGame } from './ModalsNewGame'
import { ModalsEndGame } from './ModalsEndGame'
import { ModalsDialog } from './ModalsDialog'
import { ModalsExport } from './ModalsExport'

export function Modals({ ctx }: { ctx: any }) {
  return (
    <>
      <ModalsEditPlayers ctx={ctx} />
      <ModalsNewGame ctx={ctx} />
      <ModalsEndGame ctx={ctx} />
      <ModalsDialog ctx={ctx} />
      <ModalsExport ctx={ctx} />
    </>
  )
}
