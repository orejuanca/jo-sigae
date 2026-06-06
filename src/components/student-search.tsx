'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2 } from 'lucide-react'
import { formatCedulaFinal } from '@/lib/school-config'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
  estado?: string | null
  municipio?: string | null
  plan?: string | null
}

interface StudentSearchProps {
  onSelect: (student: Student) => void
  placeholder?: string
  autoFocus?: boolean
}

export function StudentSearch({ onSelect, placeholder = 'Buscar por cédula, apellidos o nombres...', autoFocus = false }: StudentSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchStudents = async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      setResults(data.students || [])
      setIsOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchStudents(value), 300)
  }

  const handleSelect = (student: Student) => {
    setSelected(student)
    setQuery(`${student.apellidos}, ${student.nombres}`)
    setIsOpen(false)
    onSelect(student)
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-9 pr-9"
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!loading && query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((student) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{student.apellidos}, {student.nombres}</p>
                  <p className="text-xs text-muted-foreground">C.I.: {formatCedulaFinal(student.cedula)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {student.plan === 'derogado' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">BD2</span>
                  )}
                  {student.plan === 'vigente' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">BD</span>
                  )}
                  {student.fechaNacimiento && (
                    <span className="text-xs text-muted-foreground">{student.fechaNacimiento}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
          No se encontraron resultados
        </div>
      )}
    </div>
  )
}
