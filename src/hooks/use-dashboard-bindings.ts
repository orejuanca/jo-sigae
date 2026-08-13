'use client'

import { useState, useCallback, useEffect } from 'react'
import { schoolConfig } from '@/lib/school-config'

export interface DashboardBindings {
  fechaExpedicion: string
  fechaExpedicionISO: string
  lugarExpedicion: string
  directorNombre: string
  directorCedula: string
  director: { apellidosNombres: string; cedula: string }
  loaded: boolean
  reload: () => void
}

function toISO(fecha: string): string {
  if (!fecha) return new Date().toISOString().split('T')[0]
  const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return ${m[3]}--
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.substring(0, 10)
  return new Date().toISOString().split('T')[0]
}

function todayDDMMAAAA(): string {
  const d = new Date()
  return ${String(d.getDate()).padStart(2, '0')}//
}

function readCellsFromLocalStorage(plan: string): string[][] | null {
  try {
    const key = jo-sigae-dashboard-
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.cells)) return parsed.cells
  } catch { /* ignore */ }
  return null
}

export function useDashboardBindings(plan: string): DashboardBindings {
  const [bindings, setBindings] = useState<{
    fechaExpedicion: string
    lugarExpedicion: string
    directorNombre: string
    directorCedula: string
  } | null>(null)

  const extractBindings = useCallback((cells: string[][]) => {
    const z4 = cells[3]?.[25]?.trim() || ''
    const ah4 = cells[3]?.[33]?.trim() || ''
    const z6 = cells[5]?.[25]?.trim() || ''
    const z7 = cells[6]?.[25]?.trim() || ''

    setBindings({
      fechaExpedicion: z4 || todayDDMMAAAA(),
      lugarExpedicion: ah4 || schoolConfig.estado,
      directorNombre: z6 || schoolConfig.director.apellidosNombres,
      directorCedula: z7 || schoolConfig.director.cedula,
    })
  }, [])

  const reload = useCallback(() => {
    fetch(/api/dashboard-state?plan=)
      .then(res => res.json())
      .then(data => {
        if (data.found && data.datos) {
          const state = typeof data.datos === 'string' ? JSON.parse(data.datos) : data.datos
          if (state.cells) {
            extractBindings(state.cells)
            return
          }
        }
        const localCells = readCellsFromLocalStorage(plan)
        if (localCells) {
          extractBindings(localCells)
        }
      })
      .catch(() => {
        const localCells = readCellsFromLocalStorage(plan)
        if (localCells) {
          extractBindings(localCells)
        }
      })
  }, [plan, extractBindings])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const defaults = {
    fechaExpedicion: todayDDMMAAAA(),
    lugarExpedicion: schoolConfig.estado,
    directorNombre: schoolConfig.director.apellidosNombres,
    directorCedula: schoolConfig.director.cedula,
  }

  const b = bindings || defaults

  return {
    fechaExpedicion: b.fechaExpedicion,
    fechaExpedicionISO: toISO(b.fechaExpedicion),
    lugarExpedicion: b.lugarExpedicion,
    directorNombre: b.directorNombre,
    directorCedula: b.directorCedula,
    director: {
      apellidosNombres: b.directorNombre,
      cedula: b.directorCedula,
    },
    loaded: bindings !== null,
    reload,
  }
}