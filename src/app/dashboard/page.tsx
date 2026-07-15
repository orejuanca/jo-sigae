'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Save,
  Pencil,
  Trash2,
  Download,
  ArrowRightLeft,
  Database,
  Loader2,
} from 'lucide-react'

// Materias del plan vigente venezolano
const MATERIAS = [
  'Castellano',
  'Ingles y otras Leng. Extranj.',
  'Matematicas',
  'Educacion Fisica',
  'Arte y Patrimonio',
  'Ciencias Naturales',
  'Geografia, Hist. y Ciudad.',
]

const ANIOS = ['1er AO', '2do AO', '3er AO', '4to AO', '5to AO']

interface NotaRow {
  nota: string
  te: string
  fecha: string
  plantel: string
}

interface Plantel {
  nombre: string
  localidad: string
  ef: string
}

const emptyNotaRow = (): NotaRow => ({ nota: '', te: '', fecha: '', plantel: '' })
const emptyNotas = (): NotaRow[][] => Array(5).fill(null).map(() => Array(7).fill(null).map(emptyNotaRow))
const emptyPlanteles = (): Plantel[] => Array(5).fill(null).map(() => ({ nombre: '', localidad: '', ef: '' }))

export default function DashboardPage() {
  // Plan toggle
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Datos Personales
  const [cedula, setCedula] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [nombres, setNombres] = useState('')
  const [pais, setPais] = useState('VENEZUELA')
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')

  // Planteles
  const [planteles, setPlanteles] = useState<Plantel[]>(emptyPlanteles())

  // Notas por ao (5 aos x 7 materias)
  const [notas, setNotas] = useState<NotaRow[][]>(emptyNotas())

  // Observaciones
  const [observaciones, setObservaciones] = useState('')

  // Validacion Titulo / Notas
  const [serialT, setSerialT] = useState('')
  const [fechaEmisionT, setFechaEmisionT] = useState('')
  const [anioEgresoT, setAnioEgresoT] = useState('')
  const [fechaEmisionN, setFechaEmisionN] = useState('')
  const [promedioTotal, setPromedioTotal] = useState('')

  // Cargar conteo de registros
  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?plan=${plan}`)
      const data = await res.json()
      setTotalRecords(data.totalStudents || 0)
    } catch {}
  }, [plan])

  useEffect(() => { loadCount() }, [loadCount])

  // Today date
  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

  // Reset form
  const resetForm = () => {
    setEditingId(null)
    setCedula('')
    setFechaNacimiento('')
    setApellidos('')
    setNombres('')
    setPais('VENEZUELA')
    setEstado('')
    setMunicipio('')
    setPlanteles(emptyPlanteles())
    setNotas(emptyNotas())
    setObservaciones('')
    setSerialT('')
    setFechaEmisionT('')
    setAnioEgresoT('')
    setFechaEmisionN('')
    setPromedioTotal('')
  }

  // Show message
  const showMsg = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // Buscar alumno
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(searchQuery)}&plan=${plan}`)
      const data = await res.json()
      const students = data.students || []
      if (students.length > 0) {
        const s = students[0]
        setEditingId(s.id)
        setCedula(s.cedula)
        setFechaNacimiento(s.fechaNacimiento || '')
        setApellidos(s.apellidos)
        setNombres(s.nombres)
        setPais(s.pais || 'VENEZUELA')
        setEstado(s.estado || '')
        setMunicipio(s.municipio || '')
        // Load rawData for notas, planteles, observaciones, validacion
        if (s.rawData) {
          try {
            const rd = JSON.parse(s.rawData)
            if (rd.planteles) setPlanteles(rd.planteles)
            if (rd.notas) setNotas(rd.notas)
            if (rd.observaciones) setObservaciones(rd.observaciones)
            if (rd.serialT) setSerialT(rd.serialT)
            if (rd.fechaEmisionT) setFechaEmisionT(rd.fechaEmisionT)
            if (rd.anioEgresoT) setAnioEgresoT(rd.anioEgresoT)
            if (rd.fechaEmisionN) setFechaEmisionN(rd.fechaEmisionN)
            if (rd.promedioTotal) setPromedioTotal(rd.promedioTotal)
          } catch {}
        }
        showMsg('ok', `Alumno encontrado: ${s.apellidos}, ${s.nombres}`)
      } else {
        showMsg('error', 'No se encontro ningun alumno con esa busqueda')
      }
    } catch {
      showMsg('error', 'Error al buscar alumno')
    }
    setLoading(false)
  }

  // Guardar datos (crear nuevo)
  const handleGuardar = async () => {
    if (!cedula.trim() || !apellidos.trim() || !nombres.trim()) {
      showMsg('error', 'Cedula, Apellidos y Nombres son obligatorios')
      return
    }
    setSaving(true)
    try {
      const rawData = JSON.stringify({ planteles, notas, observaciones, serialT, fechaEmisionT, anioEgresoT, fechaEmisionN, promedioTotal })
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, plan, rawData }),
      })
      const data = await res.json()
      if (res.ok) {
        showMsg('ok', 'Datos guardados correctamente')
        resetForm()
        loadCount()
      } else {
        showMsg('error', data.error || 'Error al guardar')
      }
    } catch {
      showMsg('error', 'Error de conexion')
    }
    setSaving(false)
  }

  // Guardar editado (actualizar)
  const handleGuardarEditado = async () => {
    if (!editingId) {
      showMsg('error', 'No hay alumno seleccionado para editar')
      return
    }
    setSaving(true)
    try {
      const rawData = JSON.stringify({ planteles, notas, observaciones, serialT, fechaEmisionT, anioEgresoT, fechaEmisionN, promedioTotal })
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData }),
      })
      const data = await res.json()
      if (res.ok) {
        showMsg('ok', 'Datos actualizados correctamente')
      } else {
        showMsg('error', data.error || 'Error al actualizar')
      }
    } catch {
      showMsg('error', 'Error de conexion')
    }
    setSaving(false)
  }

  // Eliminar datos
  const handleEliminar = async () => {
    if (!editingId) {
      showMsg('error', 'No hay alumno seleccionado para eliminar')
      return
    }
    if (!confirm('Esta seguro de eliminar este alumno? Esta accion no se puede deshacer.')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${editingId}`, { method: 'DELETE' })
      if (res.ok) {
        showMsg('ok', 'Alumno eliminado correctamente')
        resetForm()
        loadCount()
      } else {
        const data = await res.json()
        showMsg('error', data.error || 'Error al eliminar')
      }
    } catch {
      showMsg('error', 'Error de conexion')
    }
    setSaving(false)
  }

  // Exportar base de datos
  const handleExportar = async () => {
    try {
      const res = await fetch(`/api/students?plan=${plan}&limit=99999`)
      const data = await res.json()
      const students = data.students || []
      // Generate CSV
      const headers = ['Cedula', 'Apellidos', 'Nombres', 'Fecha Nacimiento', 'Pais', 'Estado', 'Municipio', 'Plan']
      const rows = students.map((s: Record<string, string>) => [s.cedula, s.apellidos, s.nombres, s.fechaNacimiento || '', s.pais || '', s.estado || '', s.municipio || '', s.plan || ''])
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `base_datos_${plan}_${todayStr.replace(/\//g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showMsg('ok', `Base de datos exportada (${students.length} registros)`)
    } catch {
      showMsg('error', 'Error al exportar')
    }
  }

  // Update nota
  const updateNota = (anioIdx: number, matIdx: number, field: keyof NotaRow, value: string) => {
    setNotas(prev => {
      const copy = prev.map(a => a.map(m => ({ ...m })))
      copy[anioIdx][matIdx][field] = value
      return copy
    })
  }

  // Update plantel
  const updatePlantel = (idx: number, field: keyof Plantel, value: string) => {
    setPlanteles(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  return (
    <AppShell>
      <div className="space-y-0">
        {/* === HEADER === */}
        <div className="bg-blue-800 text-white px-4 py-3 rounded-t-lg">
          <h1 className="text-sm sm:text-base font-bold text-center leading-tight">
            AGREGAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS
          </h1>
        </div>

        {/* === MESSAGE === */}
        {message && (
          <div className={`px-4 py-2 text-sm font-medium text-center ${message.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* === TOP ROW: Datos Personales + Botones === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Datos Personales */}
          <div className="lg:col-span-2 bg-amber-50 border border-amber-200 p-4 space-y-3">
            <h2 className="text-sm font-bold text-amber-900 border-b border-amber-300 pb-1">DATOS PERSONALES</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="CEDULA" required value={cedula} onChange={setCedula} placeholder="V-00000000" />
              <Field label="FECHA DE NACIMIENTO" required value={fechaNacimiento} onChange={setFechaNacimiento} placeholder="DD/MM/AAAA" />
              <Field label="APELLIDOS" required value={apellidos} onChange={setApellidos} placeholder="Apellidos del alumno" />
              <Field label="NOMBRES" required value={nombres} onChange={setNombres} placeholder="Nombres del alumno" />
              <Field label="PAIS DE NACIMIENTO" value={pais} onChange={setPais} />
              <Field label="ESTADO" value={estado} onChange={setEstado} placeholder="Estado" />
              <Field label="MUNICIPIO" value={municipio} onChange={setMunicipio} placeholder="Municipio" />
            </div>
          </div>

          {/* Botones y fecha */}
          <div className="bg-amber-50 border border-amber-200 border-l-0 p-4 flex flex-col gap-3">
            <div className="text-right text-sm text-gray-700 font-mono">{todayStr}</div>
            <div className="text-right text-sm font-bold text-blue-800">{totalRecords.toLocaleString()} Registros en la Base de Datos</div>

            <div className="flex-1" />

            {/* Search */}
            <div className="flex gap-1">
              <Input
                className="h-8 text-xs"
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button size="sm" className="h-8 bg-pink-500 hover:bg-pink-600 text-white text-xs px-2" onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ActionButton label="Buscar/Editar Alumno" color="bg-pink-500 hover:bg-pink-600" onClick={handleSearch} icon={<Search className="h-3 w-3" />} />
              <ActionButton label="Exportar Base de Datos" color="bg-red-600 hover:bg-red-700" onClick={handleExportar} icon={<Download className="h-3 w-3" />} />
              <ActionButton label="Guardar Datos" color="bg-sky-500 hover:bg-sky-600" onClick={handleGuardar} disabled={saving || !!editingId} icon={<Save className="h-3 w-3" />} />
              <ActionButton label="Guardar Editado" color="bg-gray-500 hover:bg-gray-600" onClick={handleGuardarEditado} disabled={saving || !editingId} icon={<Pencil className="h-3 w-3" />} />
            </div>
            <ActionButton label="Eliminar Datos" color="bg-red-700 hover:bg-red-800" onClick={handleEliminar} disabled={saving || !editingId} icon={<Trash2 className="h-3 w-3" />} fullWidth />

            {/* Plan Toggle */}
            <button
              onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); resetForm() }}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded transition flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              IR A {plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'}
            </button>
          </div>
        </div>

        {/* === MIDDLE: Planteles + Notas por Ao === */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-0 border-t-0">
          {/* Planteles */}
          <div className="xl:col-span-1 bg-amber-50 border border-amber-200 border-t-0 p-4">
            <h2 className="text-sm font-bold text-amber-900 border-b border-amber-300 pb-1 mb-3">N DEL PLANTEL</h2>
            <div className="space-y-2">
              {['NOMBRE DEL PLANTEL', 'LOCALIDAD', 'E.F.'] && (
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 text-[10px] font-bold text-gray-600 mb-1">
                  <span className="w-5">#</span>
                  <span>PLANTEL</span>
                  <span>LOCALIDAD</span>
                  <span>E.F.</span>
                </div>
              )}
              {planteles.map((p, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 items-center">
                  <span className="text-[10px] text-gray-500 w-5">{i + 1}</span>
                  <input className="h-6 text-[10px] border border-amber-300 rounded px-1 bg-white" value={p.nombre} onChange={e => updatePlantel(i, 'nombre', e.target.value)} />
                  <input className="h-6 text-[10px] border border-amber-300 rounded px-1 bg-white" value={p.localidad} onChange={e => updatePlantel(i, 'localidad', e.target.value)} />
                  <input className="h-6 w-10 text-[10px] border border-amber-300 rounded px-1 bg-white text-center" value={p.ef} onChange={e => updatePlantel(i, 'ef', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Notas por Ao */}
          <div className="xl:col-span-3 bg-amber-50 border border-amber-200 border-l-0 border-t-0 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ANIOS.map((anio, ai) => (
                <div key={ai} className="border border-amber-300 rounded bg-amber-25/50 overflow-hidden">
                  <div className="bg-amber-200 px-2 py-1">
                    <h3 className="text-xs font-bold text-amber-900">{anio.toUpperCase()}</h3>
                  </div>
                  <div className="p-1">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_40px_30px_60px_70px] gap-0.5 text-[9px] font-bold text-gray-500 mb-0.5 px-0.5">
                      <span>AREAS DE FORMACION</span>
                      <span>NOTA</span>
                      <span>T-E</span>
                      <span>FECHA</span>
                      <span>PLANTEL</span>
                    </div>
                    {MATERIAS.map((mat, mi) => (
                      <div key={mi} className="grid grid-cols-[1fr_40px_30px_60px_70px] gap-0.5 items-center py-0.5 px-0.5 border-t border-amber-100">
                        <span className="text-[9px] text-gray-700 truncate" title={mat}>{mat}</span>
                        <input className="h-5 text-[9px] border border-gray-300 rounded px-0.5 text-center bg-white" value={notas[ai][mi].nota} onChange={e => updateNota(ai, mi, 'nota', e.target.value)} />
                        <input className="h-5 text-[9px] border border-gray-300 rounded px-0.5 text-center bg-white" value={notas[ai][mi].te} onChange={e => updateNota(ai, mi, 'te', e.target.value)} />
                        <input className="h-5 text-[9px] border border-gray-300 rounded px-0.5 text-center bg-white" value={notas[ai][mi].fecha} onChange={e => updateNota(ai, mi, 'fecha', e.target.value)} placeholder="DD/MM/AA" />
                        <input className="h-5 text-[9px] border border-gray-300 rounded px-0.5 bg-white" value={notas[ai][mi].plantel} onChange={e => updateNota(ai, mi, 'plantel', e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === BOTTOM: Observaciones + Validacion === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t-0">
          {/* Observaciones */}
          <div className="bg-amber-50/70 border border-amber-200 border-t-0 p-4">
            <h2 className="text-sm font-bold text-amber-900 border-b border-amber-300 pb-1 mb-2">OBSERVACIONES</h2>
            <textarea
              className="w-full h-28 text-xs border border-amber-300 rounded p-2 bg-white resize-none"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ingrese observaciones..."
            />
          </div>

          {/* Validacion Titulo / Notas */}
          <div className="bg-amber-50/70 border border-amber-200 border-l-0 border-t-0 p-4">
            <h2 className="text-sm font-bold text-amber-900 border-b border-amber-300 pb-1 mb-2">VALIDACION TITULO / NOTAS</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Serial T." value={serialT} onChange={setSerialT} />
              <Field label="Fecha Emision T." value={fechaEmisionT} onChange={setFechaEmisionT} placeholder="DD/MM/AAAA" />
              <Field label="Ao Egreso T." value={anioEgresoT} onChange={setAnioEgresoT} placeholder="AAAA" />
              <Field label="Fecha Emision N." value={fechaEmisionN} onChange={setFechaEmisionN} placeholder="DD/MM/AAAA" />
              <Field label="Promedio Total" required value={promedioTotal} onChange={setPromedioTotal} placeholder="00.00" />
            </div>
          </div>
        </div>

        {/* === FOOTER === */}
        <div className="bg-blue-800 text-white text-center text-[10px] py-1 rounded-b-lg">
          CIRCULAR N 05, (02/07/2003) (modificada al 30/03/2007)
        </div>
      </div>
    </AppShell>
  )
}

// === Sub-components ===

function Field({ label, value, onChange, placeholder, required, type }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type || 'text'}
        className="h-7 text-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function ActionButton({ label, color, onClick, disabled, icon, fullWidth }: {
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? '' : ''} ${color} text-white text-[10px] font-bold py-1.5 px-2 rounded transition disabled:opacity-50 flex items-center justify-center gap-1 ${fullWidth ? 'w-full' : ''}`}
    >
      {icon}
      {label}
    </button>
  )
}