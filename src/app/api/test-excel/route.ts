import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';

export async function GET() {
  try {
    const cwd = process.cwd();
    const uploadPath = join(cwd, 'upload');
    const filePath = join(cwd, 'upload', 'DATA_ALUMNOS.xlsx');

    const result: Record<string, unknown> = {
      cwd,
      uploadPath,
      filePath,
      uploadExists: existsSync(uploadPath),
      fileExists: existsSync(filePath),
    };

    if (existsSync(uploadPath)) {
      try {
        result.uploadFiles = readdirSync(uploadPath);
      } catch (e: unknown) {
        result.uploadError = (e as Error).message;
      }
    }

    if (existsSync(filePath)) {
      try {
        const stat = statSync(filePath);
        result.fileSize = stat.size;
      } catch (e: unknown) {
        result.statError = (e as Error).message;
      }

      try {
        const wb = XLSX.readFile(filePath, { cellDates: true });
        result.sheets = wb.SheetNames;
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
        result.rowCount = rows.length;
        result.firstRow = rows[0] ? Object.keys(rows[0] as object) : [];
      } catch (e: unknown) {
        result.xlsxError = (e as Error).message;
        result.xlsxStack = (e as Error).stack?.substring(0, 500);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, stack: (error as Error).stack?.substring(0, 500) }, { status: 500 });
  }
}