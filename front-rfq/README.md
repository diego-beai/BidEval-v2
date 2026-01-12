# RFQ Processor - Frontend

Frontend web para el procesamiento automático de RFQs (Request for Quotations) con análisis de múltiples proveedores utilizando el workflow de n8n con IA.

## 🚀 Características

- **Drag & Drop**: Interfaz intuitiva para cargar archivos PDF
- **Procesamiento Inteligente**: Integración con workflow n8n que incluye:
  - OCR automático para PDFs escaneados
  - Clasificación de proveedores con IA
  - Detección de tipos de evaluación
  - Análisis de ítems con LLM
- **Visualización de Resultados**: Tabla dinámica con evaluaciones por proveedor
- **Exportación**: Descarga de resultados en formato CSV
- **Diseño Profesional**: Interfaz oscura moderna con gradientes y animaciones

## 🛠️ Stack Tecnológico

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool y dev server
- **Zustand** - State management
- **TanStack Table** - Tablas avanzadas
- **React Dropzone** - Upload de archivos
- **CSS Custom Properties** - Sistema de diseño consistente

## 📋 Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x
- n8n workflow activo y accesible

## 🔧 Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Copia el archivo `.env.example` a `.env.local` y configura las credenciales:
   ```bash
   cp .env.example .env.local
   ```

   Edita `.env.local`:
   ```env
   # Configuración de Supabase (requerida para gráficos persistentes)
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui

   # Configuración de n8n (opcional)
   VITE_N8N_WEBHOOK_URL=https://n8n.beaienergy.com/webhook/tabla
   ```

   **🔑 Obtener credenciales de Supabase:**
   1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   2. Selecciona tu proyecto
   3. Ve a Settings → API
   4. Copia la "Project URL" para `VITE_SUPABASE_URL`
   5. Copia la "anon public" key para `VITE_SUPABASE_ANON_KEY`

3. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

Para previsualizar el build:
```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── layout/         # Layout (Header, Footer, AppLayout)
│   ├── upload/         # Componentes de upload
│   ├── processing/     # Estado de procesamiento
│   ├── results/        # Tabla de resultados
│   └── ui/             # Componentes UI reutilizables
├── config/             # Configuración y constantes
├── hooks/              # Custom React hooks
├── services/           # Servicios de API
├── stores/             # Zustand stores
├── types/              # Definiciones TypeScript
├── utils/              # Utilidades (validators, formatters, etc)
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada
```

## 🔌 Integración con n8n

### Configuración del Webhook

El frontend se comunica con n8n a través de un webhook POST que:

1. Recibe el archivo PDF
2. Procesa el documento (OCR si es necesario)
3. Clasifica el proveedor y tipo de evaluación
4. Evalúa los ítems de RFQ
5. Devuelve un array de resultados

### Datos Enviados al Webhook

⚠️ **IMPORTANTE**: El frontend ahora soporta **procesamiento paralelo de múltiples archivos** (hasta 7 archivos simultáneos).

Cada archivo se envía como una petición POST JSON independiente a `http://localhost:5678/webhook/rfq`:

```json
{
  "file_id": "rfq-1735478123456-abc123def",
  "file_title": "oferta_sacyr.pdf",
  "file_url": "",
  "file_binary": "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCB...",
  "metadata": {
    "uploadedAt": "2025-12-29T10:30:00.000Z",
    "fileName": "oferta_sacyr.pdf",
    "fileSize": 2048576,
    "fileId": "rfq-1735478123456-abc123def"
  }
}
```

**Campos:**
- `file_id`: ID único generado automáticamente
- `file_title`: Nombre del archivo original
- `file_url`: Vacío (se mantiene por compatibilidad)
- `file_binary`: Contenido del PDF en base64 **sin prefijo** `data:application/pdf;base64,`
- `metadata`: Información adicional del archivo

**Procesamiento Paralelo:**
Cuando el usuario selecciona múltiples archivos (2-7 PDFs):
1. El frontend envía **todas las peticiones en paralelo** usando `Promise.all()`
2. Cada archivo se procesa independientemente en n8n
3. El frontend espera a que **todas** terminen
4. Se muestra **solo la última respuesta** (que contiene todos los datos actualizados)

**Ejemplo de acceso en n8n:**
```javascript
// Webhook recibe JSON
$json.file_id        // "rfq-1735478123456-abc123def"
$json.file_title     // "oferta_sacyr.pdf"
$json.file_binary    // Base64 del PDF
$json.metadata.fileSize  // 2048576
```

### Formato de Respuesta Esperado
```json
[
  {
    "id": 1,
    "item": "Descripción del ítem",
    "fase": "FEED",
    "Evaluation": "Technical Evaluation",
    "TECNICASREUNIDAS": "INCLUIDO - Descripción | Ref: Pág 12",
    "IDOM": "NO COTIZADO",
    "SACYR": "45.000 EUR - Precio fijo | Ref: Tabla 3.2",
    ...
  }
]
```

### Proveedores Soportados

- **Técnicas Reunidas** (TR, TECNICASREUNIDAS)
- **IDOM**
- **SACYR**
- **Empresarios Agrupados** (EA)
- **SENER**
- **TRESCA**
- **WORLEY**

## 🎨 Personalización

### Colores y Tema

Los colores están definidos en `styles.css` usando CSS Custom Properties:

```css
:root {
  --bg0: #070a0c;
  --bg1: #0b1014;
  --card: rgba(14, 20, 26, 0.84);
  --text: #e8eef5;
  --muted: rgba(232, 238, 245, 0.70);
  --accent: #12b5b0;
  --danger: #ff5d5d;
  --ok: #41d17a;
}
```

Para cambiar los colores, modifica estos valores en `styles.css`.

### Configuración de API

Edita `src/config/constants.ts` para ajustar:
- Tamaño máximo de archivo
- Timeout de requests
- Tipos de archivo permitidos
- Nombres de proveedores

## 🐛 Troubleshooting

### Error: "Request timeout"
- El webhook de n8n está tardando más de 10 minutos
- Verifica que n8n esté corriendo
- Revisa la configuración de timeout en `constants.ts`

### Error: "No se recibieron resultados"
- Verifica que el workflow de n8n esté activo
- Comprueba que la URL del webhook sea correcta
- Revisa los logs de n8n para errores

### Archivo no se sube
- Verifica que sea un archivo PDF válido
- Comprueba que el tamaño sea menor a 50MB
- Revisa la consola del navegador para errores CORS

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Genera build de producción
- `npm run preview` - Previsualiza build de producción
- `npm run lint` - Ejecuta linter de código

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 🙏 Créditos

- **n8n** - Automatización del workflow
- **Claude AI** - Procesamiento de IA para evaluaciones
- **React** - Framework UI
- **Vite** - Build tool

---

Desarrollado con ❤️ para P2X
