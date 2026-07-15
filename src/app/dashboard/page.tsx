'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Loader2,
} from 'lucide-react'

const MATERIAS = [
  'Castellano',
  'Ingles y otras Leng. Extranj.',
  'Matematicas',
  'Educacion Fisica',
  'Arte y Patrimonio',
  'Ciencias Naturales',
  'Geografia, Hist. y Ciudad.',
]

const ANIOS = ['PRIMER AO', 'SEGUNDO AO', 'TERCER AO', 'CUARTO AO', 'QUINTO AO']

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
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

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

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?plan=${plan}`)
      const data = await res.json()
      setTotalRecords(data.totalStudents || 0)
    } catch {}
  }, [plan])

  useEffect(() => { loadCount() }, [loadCount])

  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

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

  const showMsg = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

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
        showMsg('error', 'No se encontro ningun alumno')
      }
    } catch {
      showMsg('error', 'Error al buscar')
    }
    setLoading(false)
  }

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

  const handleGuardarEditado = async () => {
    if (!editingId) { showMsg('error', 'No hay alumno seleccionado'); return }
    setSaving(true)
    try {
      const rawData = JSON.stringify({ planteles, notas, observaciones, serialT, fechaEmisionT, anioEgresoT, fechaEmisionN, promedioTotal })
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData }),
      })
      if (res.ok) {
        showMsg('ok', 'Datos actualizados')
      } else {
        const data = await res.json()
        showMsg('error', data.error || 'Error al actualizar')
      }
    } catch {
      showMsg('error', 'Error de conexion')
    }
    setSaving(false)
  }

  const handleEliminar = async () => {
    if (!editingId) { showMsg('error', 'No hay alumno seleccionado'); return }
    if (!confirm('Eliminar este alumno?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${editingId}`, { method: 'DELETE' })
      if (res.ok) {
        showMsg('ok', 'Alumno eliminado')
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

  const handleExportar = async () => {
    try {
      const res = await fetch(`/api/students?plan=${plan}&limit=99999`)
      const data = await res.json()
      const students = data.students || []
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
      showMsg('ok', `Exportados ${students.length} registros`)
    } catch {
      showMsg('error', 'Error al exportar')
    }
  }

  const updateNota = (ai: number, mi: number, field: keyof NotaRow, value: string) => {
    setNotas(prev => {
      const copy = prev.map(a => a.map(m => ({ ...m })))
      copy[ai][mi][field] = value
      return copy
    })
  }

  const updatePlantel = (idx: number, field: keyof Plantel, value: string) => {
    setPlanteles(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  // Datos personales fields - en el orden exacto del Excel
  const personalFields = [
    { label: 'CEDULA', value: cedula, onChange: setCedula, placeholder: 'V-00000000', required: true },
    { label: 'FECHA DE NACIMIENTO', value: fechaNacimiento, onChange: setFechaNacimiento, placeholder: 'DD/MM/AAAA', required: true },
    { label: 'APELLIDOS', value: apellidos, onChange: setApellidos, placeholder: 'Apellidos', required: true },
    { label: 'NOMBRES', value: nombres, onChange: setNombres, placeholder: 'Nombres', required: true },
    { label: 'PAIS DE NACIMIENTO', value: pais, onChange: setPais, placeholder: '' },
    { label: 'ESTADO', value: estado, onChange: setEstado, placeholder: '' },
    { label: 'MUNICIPIO', value: municipio, onChange: setMunicipio, placeholder: '' },
  ]

  return (
    <AppShell>
      <div className="space-y-0">
        {/* === HEADER === */}
        <div className="bg-blue-800 text-white px-3 py-2 rounded-t-lg">
          <h1 className="text-[11px] sm:text-xs font-bold text-center leading-tight">
            AGREGAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS
          </h1>
        </div>

        {/* === MESSAGE === */}
        {message && (
          <div className={`px-4 py-1.5 text-xs font-medium text-center ${message.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* === ROW 1: Datos Personales (izq) + Botones (der) === */}
        <div className="flex flex-col lg:flex-row border border-amber-300 border-t-0">
          {/* DATOS PERSONALES - Labels a la derecha, inputs a la derecha de cada label */}
          <div className="lg:w-[340px] bg-amber-50 p-3 border-r border-amber-300">
            <h2 className="text-[11px] font-bold text-amber-900 border-b border-amber-300 pb-1 mb-2">DATOS PERSONALES</h2>
            <div className="space-y-1.5">
              {personalFields.map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-gray-700 text-right w-[160px] shrink-0">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    className="flex-1 h-6 text-[11px] border border-amber-300 rounded px-1.5 bg-amber-100/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* FECHA + REGISTROS + BOTONES */}
          <div className="flex-1 bg-amber-50 p-3 space-y-2">
            {/* Fecha y conteo */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] text-gray-700 font-mono">{todayStr}</div>
                <div className="text-[10px] text-blue-800 font-bold">{totalRecords.toLocaleString()} Registros en la Base de Datos</div>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-1">
              <input
                className="flex-1 h-7 text-[11px] border border-gray-300 rounded px-2"
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-7 px-2 bg-pink-500 hover:bg-pink-600 text-white rounded text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Buscar/Editar Alumno
              </button>
            </div>

            {/* Botones de accion en fila */}
            <div className="flex flex-wrap gap-1.5">
              <button onClick={handleExportar} className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold flex items-center gap-1">
                <Download className="h-3 w-3" /> EXPORTAR BASE DE DATOS
              </button>
              <button onClick={handleGuardar} disabled={saving || !!editingId} className="h-7 px-2 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                <Save className="h-3 w-3" /> Guardar Datos
              </button>
              <button onClick={handleGuardarEditado} disabled={saving || !editingId} className="h-7 px-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                <Pencil className="h-3 w-3" /> Guardar Editado
              </button>
              <button onClick={handleEliminar} disabled={saving || !editingId} className="h-7 px-2 bg-red-700 hover:bg-red-800 text-white rounded text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                <Trash2 className="h-3 w-3" /> Eliminar Datos
              </button>
            </div>

            {/* Plan Toggle */}
            <button
              onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); resetForm() }}
              className="h-8 px-3 bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold rounded flex items-center justify-center gap-2 w-fit"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              IR A {plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'}
            </button>
          </div>
        </div>

        {/* === ROW 2: Planteles (izq) + Tablas de aos horizontales (der) === */}
        <div className="flex border border-amber-300 border-t-0">
          {/* N DEL PLANTEL */}
          <div className="w-[200px] bg-amber-50 border-r border-amber-300 shrink-0 overflow-hidden">
            <div className="bg-amber-200 px-2 py-1">
              <h3 className="text-[10px] font-bold text-amber-900">N DEL PLANTEL</h3>
            </div>
            <div className="px-1 pt-1">
              {/* Header */}
              <div className="grid grid-cols-[16px_1fr_1fr_24px] gap-0 text-[8px] font-bold text-gray-500 pb-0.5">
                <span>#</span>
                <span>PLANTEL</span>
                <span>LOCAL.</span>
                <span>E.F.</span>
              </div>
              {planteles.map((p, i) => (
                <div key={i} className="grid grid-cols-[16px_1fr_1fr_24px] gap-0 items-center py-0.5">
                  <span className="text-[9px] text-gray-400 text-center">{i + 1}</span>
                  <input className="h-5 text-[8px] border border-amber-200 rounded px-0.5 bg-amber-100/50" value={p.nombre} onChange={e => updatePlantel(i, 'nombre', e.target.value)} />
                  <input className="h-5 text-[8px] border border-amber-200 rounded px-0.5 bg-amber-100/50" value={p.localidad} onChange={e => updatePlantel(i, 'localidad', e.target.value)} />
                  <input className="h-5 text-[8px] border border-amber-200 rounded px-0.5 bg-amber-100/50 text-center" value={p.ef} onChange={e => updatePlantel(i, 'ef', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* TABLAS DE AOS - Horizontales una al lado de la otra */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {ANIOS.map((anio, ai) => (
                <div key={ai} className="w-[320px] border-r border-amber-200 last:border-r-0">
                  {/* Header del ao */}
                  <div className="bg-amber-200 px-2 py-1">
                    <h3 className="text-[10px] font-bold text-amber-900">{anio}</h3>
                  </div>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_36px_28px_52px_72px] gap-0 px-1 text-[8px] font-bold text-gray-500 pb-0.5 border-b border-amber-100">
                    <span>AREAS DE FORMACION</span>
                    <span className="text-center">NOTA</span>
                    <span className="text-center">T-E</span>
                    <span className="text-center">FECHA</span>
                    <span>PLANTEL</span>
                  </div>
                  {/* Materias */}
                  {MATERIAS.map((mat, mi) => (
                    <div key={mi} className="grid grid-cols-[1fr_36px_28px_52px_72px] gap-0 px-1 items-center py-0 border-b border-amber-50">
                      <span className="text-[8px] text-gray-700 truncate pr-1" title={mat}>{mat}</span>
                      <input className="h-5 text-[9px] border border-gray-200 rounded px-0.5 text-center bg-amber-100/50" value={notas[ai][mi].nota} onChange={e => updateNota(ai, mi, 'nota', e.target.value)} />
                      <input className="h-5 text-[9px] border border-gray-200 rounded px-0.5 text-center bg-amber-100/50" value={notas[ai][mi].te} onChange={e => updateNota(ai, mi, 'te', e.target.value)} />
                      <input className="h-5 text-[8px] border border-gray-200 rounded px-0.5 text-center bg-amber-100/50" value={notas[ai][mi].fecha} onChange={e => updateNota(ai, mi, 'fecha', e.target.value)} placeholder="DD/AA" />
                      <input className="h-5 text-[8px] border border-gray-200 rounded px-0.5 bg-amber-100/50" value={notas[ai][mi].plantel} onChange={e => updateNota(ai, mi, 'plantel', e.target.value)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === ROW 3: Observaciones (izq) + Validacion (der) === */}
        <div className="flex flex-col lg:flex-row border border-amber-300 border-t-0">
          {/* OBSERVACIONES */}
          <div className="flex-1 bg-amber-50 p-3 border-r border-amber-300">
            <h2 className="text-[11px] font-bold text-amber-900 border-b border-amber-300 pb-1 mb-2">OBSERVACIONES</h2>
            <textarea
              className="w-full h-20 text-[11px] border border-amber-300 rounded p-2 bg-amber-100/50 resize-none focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ingrese observaciones..."
            />
          </div>

          {/* VALIDACION TITULO / NOTAS */}
          <div className="lg:w-[360px] bg-amber-50 p-3">
            <h2 className="text-[11px] font-bold text-amber-900 border-b border-amber-300 pb-1 mb-2">VALIDACION TITULO / NOTAS</h2>
            <div className="space-y-1.5">
              {[
                { label: 'Serial T.', value: serialT, onChange: setSerialT, ph: '' },
                { label: 'Fecha Emision T.', value: fechaEmisionT, onChange: setFechaEmisionT, ph: 'DD/MM/AAAA' },
                { label: 'Ao Egreso T.', value: anioEgresoT, onChange: setAnioEgresoT, ph: 'AAAA' },
                { label: 'Fecha Emision N.', value: fechaEmisionN, onChange: setFechaEmisionN, ph: 'DD/MM/AAAA' },
                { label: 'Promedio Total', value: promedioTotal, onChange: setPromedioTotal, ph: '00.00', required: true },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-gray-700 text-right w-[120px] shrink-0">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    className="flex-1 h-6 text-[11px] border border-amber-300 rounded px-1.5 bg-amber-100/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.ph}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === FOOTER === */}
        <div className="bg-blue-800 text-white text-center text-[9px] py-1 rounded-b-lg">
          CIRCULAR N 05, (02/07/2003) (modificada al 30/03/2007)
        </div>
      </div>
    </AppShell>
  )
}