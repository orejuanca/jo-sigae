import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Trace flatmap build step by step for OBS
export async function GET() {
  try {
    const db = getDb('derogado')
    // Get student ABARCA (first one with real obs)
    const student = await db.student.findFirst({
      where: { cedula: 'V 26489287' },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' })

    const rawObj = JSON.parse(student.rawData)
    const normalized: Record<string, any> = {}
    for (const [k, v] of Object.entries(rawObj)) {
      normalized[k.replace(/\u00b0/g, '')] = v
    }

    // Check hasFlatInstKeys
    const hasFlatInstKeys = Object.keys(normalized).some(k => {
      const n = parseInt(k); return n >= 8 && n <= 38
    })

    // Check if 'observaciones' array exists
    const obsArray = normalized['observaciones'] || []

    // Trace all OBS-related entries step by step
    const trace: any = {
      hasFlatInstKeys,
      obsArrayLength: Array.isArray(obsArray) ? obsArray.length : 'not array',
      obsArrayValue: obsArray,
    }

    // What branch will run?
    if (obsArray.length > 0) {
      trace.branch = 'FORMATO A (array)'
    } else if (hasFlatInstKeys) {
      trace.branch = 'FORMATO B (crudo BD2)'
    } else {
      trace.branch = 'ELSE (named keys)'
    }

    // Show raw values at 320-335 and 340-348
    trace.rawValues = {}
    for (let i = 320; i <= 348; i++) {
      trace.rawValues[String(i)] = normalized[String(i)]
    }

    // Check if any key matches 'OBS' pattern
    trace.obsNamedKeys = {}
    for (const [k, v] of Object.entries(normalized)) {
      if (k.toLowerCase().includes('obs')) {
        trace.obsNamedKeys[k] = v
      }
    }

    // Check all non-numeric, non-empty keys
    trace.allNonNumeric = {}
    for (const [k, v] of Object.entries(normalized)) {
      if (!/^\d+$/.test(k)) {
        trace.allNonNumeric[k] = v
      }
    }

    // Manually trace the observation mapping
    trace.manualMapping = {}
    if (trace.branch === 'FORMATO B (crudo BD2)') {
      for (let i = 0; i < 5; i++) {
        const val = normalized[String(320 + i)]
        trace.manualMapping[`OBS.BASICA.L${i + 1} <- key ${320 + i}`] = { raw: val, isBlank: !val || String(val).trim() === '' }
      }
      for (let i = 0; i < 5; i++) {
        const val = normalized[String(325 + i)]
        trace.manualMapping[`OBS.DIV.L${i + 1} <- key ${325 + i}`] = { raw: val, isBlank: !val || String(val).trim() === '' }
      }
    }

    return NextResponse.json(trace)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
