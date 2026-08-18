# apply-improvements.ps1
# Script para aplicar las mejoras de favicon, accesibilidad, PWA y OG Tags
# Ejecutar desde la raíz del proyecto jo-sigae
# PowerShell 7+ / Windows PowerShell 5.1+

$ErrorActionPreference = "Stop"
$projectRoot = Get-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIGAE - Aplicando mejoras" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------
# 1. Crear src/app/icon.svg (Favicon)
# -----------------------------------------------------------
$iconPath = Join-Path $projectRoot "src\app\icon.svg"
if (-not (Test-Path $iconPath)) {
    $iconContent = @'
<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
	 viewBox="0 0 30 30" style="enable-background:new 0 0 30 30;" xml:space="preserve">
<defs>
  <style type="text/css">
    .st194{fill:#047857;stroke:#FFFFFF;stroke-width:0.6317;stroke-miterlimit:10;}
    .st23{fill:#FFFFFF;}
  </style>
</defs>
<g>
  <path class="st194" d="M24.51,28.51H5.49c-2.21,0-4-1.79-4-4V5.49c0-2.21,1.79-4,4-4h19.03c2.21,0,4,1.79,4,4v19.03
    C28.51,26.72,26.72,28.51,24.51,28.51z"/>
  <path class="st23" d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z"/>
  <polygon class="st23" points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"/>
  <path class="st23" d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z"/>
</g>
</svg>
'@
    Set-Content -Path $iconPath -Value $iconContent -Encoding UTF8
    Write-Host "  [OK] src\app\icon.svg creado (favicon)" -ForegroundColor Green
} else {
    Write-Host "  [--] src\app\icon.svg ya existe, saltando..." -ForegroundColor Yellow
}

# -----------------------------------------------------------
# 2. Crear src/app/manifest.json (PWA)
# -----------------------------------------------------------
$manifestPath = Join-Path $projectRoot "src\app\manifest.json"
if (-not (Test-Path $manifestPath)) {
    $manifestContent = @'
{
  "name": "SIGAE - Sistema de Certificaciones",
  "short_name": "SIGAE",
  "description": "Sistema de gestion de certificaciones escolares para la U.E.N. Creacion Cua",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#047857",
  "icons": [
    {
      "src": "/logo.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
'@
    Set-Content -Path $manifestPath -Value $manifestContent -Encoding UTF8
    Write-Host "  [OK] src\app\manifest.json creado (PWA)" -ForegroundColor Green
} else {
    Write-Host "  [--] src\app\manifest.json ya existe, saltando..." -ForegroundColor Yellow
}

# -----------------------------------------------------------
# 3. Modificar src/app/layout.tsx (OG Tags + theme-color)
# -----------------------------------------------------------
$layoutPath = Join-Path $projectRoot "src\app\layout.tsx"
if (Test-Path $layoutPath) {
    $layoutContent = Get-Content -Path $layoutPath -Raw -Encoding UTF8

    # Verificar si ya tiene metadataBase (para no aplicar dos veces)
    if ($layoutContent -match "metadataBase") {
        Write-Host "  [--] layout.tsx ya tiene OG Tags, saltando..." -ForegroundColor Yellow
    } else {
        $oldMetadata = @'
export const metadata: Metadata = {
  title: "U.E.N. Creación Cúa — Sistema de Certificaciones",
  description: "Sistema de gestión de certificaciones escolares para la U.E.N. Creación Cúa, Miranda, Venezuela",
};
'@
        $newMetadata = @'
export const metadata: Metadata = {
  title: "U.E.N. Creación Cúa — Sistema de Certificaciones",
  description: "Sistema de gestión de certificaciones escolares para la U.E.N. Creación Cúa, Miranda, Venezuela",
  metadataBase: new URL("https://jo-sigae.vercel.app"),
  openGraph: {
    title: "SIGAE — Sistema de Certificaciones Escolares",
    description: "Gestión eficiente de certificaciones escolares para U.E.N. Creación Cúa, Miranda, Venezuela",
    url: "https://jo-sigae.vercel.app",
    siteName: "SIGAE",
    type: "website",
    locale: "es_VE",
    images: [
      {
        url: "/logo-gob-mppe.png",
        width: 1200,
        height: 630,
        alt: "SIGAE - Sistema de Certificaciones Escolares",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGAE — Sistema de Certificaciones Escolares",
    description: "Gestión eficiente de certificaciones escolares para U.E.N. Creación Cúa",
    images: ["/logo-gob-mppe.png"],
  },
  other: {
    "theme-color": "#047857",
  },
};
'@
        $layoutContent = $layoutContent.Replace($oldMetadata, $newMetadata)
        Set-Content -Path $layoutPath -Value $layoutContent -Encoding UTF8 -NoNewline
        Write-Host "  [OK] src\app\layout.tsx actualizado (OG Tags + theme-color)" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] No se encontro src\app\layout.tsx" -ForegroundColor Red
}

# -----------------------------------------------------------
# 4. Modificar src/app/page.tsx (Accesibilidad)
# -----------------------------------------------------------
$pagePath = Join-Path $projectRoot "src\app\page.tsx"
if (Test-Path $pagePath) {
    $pageContent = Get-Content -Path $pagePath -Raw -Encoding UTF8

    # Verificar si ya tiene <main> (para no aplicar dos veces)
    if ($pageContent -match '<main className="min-h-screen') {
        Write-Host "  [--] page.tsx ya tiene accesibilidad, saltando..." -ForegroundColor Yellow
    } else {
        # Reemplazo 1: loading state div -> main
        $pageContent = $pageContent.Replace(
            '<div className="min-h-screen flex items-center justify-center bg-gray-50">`n        <p className="text-gray-400">Cargando...</p>`n      </div>',
            '<main className="min-h-screen flex items-center justify-center bg-gray-50">`n        <p className="text-gray-400" aria-live="polite">Cargando...</p>`n      </main>'
        )

        # Reemplazo 2: wrapper div -> main
        $pageContent = $pageContent.Replace(
            '<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 p-4">',
            '<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 p-4">'
        )

        # Reemplazo 3: header section div -> header
        $pageContent = $pageContent.Replace(
            '<div className="text-center space-y-4 px-6 pb-2">',
            '<header className="text-center space-y-4 px-6 pb-2">'
        )

        # Reemplazo 4: icon container + aria-hidden
        $pageContent = $pageContent.Replace(
            '<div className="mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center">`n            <svg className="w-10 h-10 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '<div className="mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center" aria-hidden="true">`n            <svg className="w-10 h-10 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
        )

        # Reemplazo 5: close header div
        $pageContent = $pageContent.Replace(
            '        </div>`n`n        <div className="px-6">',
            '        </header>`n`n        <div className="px-6">'
        )

        # Reemplazo 6: form aria-label
        $pageContent = $pageContent.Replace(
            '<form onSubmit={handleSubmit} className="space-y-4">',
            '<form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulario de inicio de sesion">'
        )

        # Reemplazo 7: lock icon aria-hidden
        $pageContent = $pageContent.Replace(
            '<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
        )

        # Reemplazo 8: add required, aria-describedby, aria-invalid to input
        $pageContent = $pageContent.Replace(
            'autoComplete="current-password"`n                className="w-full',
            'autoComplete="current-password"`n                required`n                aria-describedby={error ? "login-error" : undefined}`n                aria-invalid={error ? true : undefined}`n                className="w-full'
        )

        # Reemplazo 9: error message with role="alert"
        $pageContent = $pageContent.Replace(
            '<p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>',
            '<p id="login-error" className="text-sm text-red-600 bg-red-50 p-2 rounded-lg" role="alert">{error}</p>'
        )

        # Reemplazo 10: button aria-busy
        $pageContent = $pageContent.Replace(
            'className="w-full h-10 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-lg transition text-sm"',
            'className="w-full h-10 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-lg transition text-sm"`n              aria-busy={loading}'
        )

        # Reemplazo 11: footer p -> footer element
        $pageContent = $pageContent.Replace(
            '<p className="text-xs text-center text-gray-400">`n              Gobierno Bolivariano de Venezuela',
            '<footer className="text-xs text-center text-gray-400">`n              Gobierno Bolivariano de Venezuela'
        )
        $pageContent = $pageContent.Replace(
            'del Poder Popular para la Educacion`n            </p>',
            'del Poder Popular para la Educacion`n            </footer>'
        )

        # Reemplazo 12: closing div -> closing main
        $pageContent = $pageContent -replace '      </div>\r?\n    </div>\r?\n  \)', '      </div>`n    </main>`n  )'

        Set-Content -Path $pagePath -Value $pageContent -Encoding UTF8 -NoNewline
        Write-Host "  [OK] src\app\page.tsx actualizado (accesibilidad)" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] No se encontro src\app\page.tsx" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Todos los cambios aplicados." -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "  Siguiente paso: ejecutar en tu proyecto:" -ForegroundColor White
Write-Host "    git add ." -ForegroundColor Yellow
Write-Host "    git commit -m `"feat: favicon, accesibilidad, PWA, OG tags`"" -ForegroundColor Yellow
Write-Host "    git push origin main" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
