# Guia de Instalacion - BidEval

Guia paso a paso para instalar BidEval en tu computadora y conectarlo al servidor Omen (n8n y Supabase).

---

## Requisitos Previos

Antes de empezar, asegurate de tener instalado:

| Software | Version minima | Como verificar |
|----------|---------------|----------------|
| Node.js | 18.x o superior | `node --version` |
| npm | 9.x o superior | `npm --version` |
| Git | Cualquiera | `git --version` |

### Instalar Node.js (si no lo tienes)

**Windows/Mac:**
1. Ve a [nodejs.org](https://nodejs.org)
2. Descarga la version **LTS** (recomendada)
3. Ejecuta el instalador y sigue los pasos

**Verificar instalacion:**
```bash
node --version   # Debe mostrar v18.x.x o superior
npm --version    # Debe mostrar 9.x.x o superior
```

---

## Paso 1: Descargar el Proyecto

### Opcion A: Clonar con Git (Recomendado)

```bash
git clone https://github.com/TU_ORGANIZACION/bideval.git
cd bideval
```

### Opcion B: Descargar ZIP

1. Ve al repositorio en GitHub
2. Click en el boton verde **"Code"**
3. Selecciona **"Download ZIP"**
4. Extrae el ZIP en una carpeta de tu eleccion
5. Abre una terminal en esa carpeta

---

## Paso 2: Instalar Dependencias

Navega a la carpeta del frontend y ejecuta:

```bash
cd front-rfq
npm install
```

Este proceso puede tardar unos minutos. Veras muchas lineas de texto - eso es normal.

**Resultado esperado:**
```
added XXX packages in XXs
```

---

## Paso 3: Configurar Variables de Entorno

### 3.1 Crear archivo de configuracion

```bash
cp .env.example .env.local
```

### 3.2 Editar el archivo `.env.local`

Abre el archivo `.env.local` con tu editor de texto favorito (VS Code, Notepad++, etc.) y reemplaza el contenido con:

```env
# Configuracion de Supabase (Servidor Omen)
VITE_SUPABASE_URL=https://supabase.omen.local
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA_AQUI

# Configuracion de n8n (Servidor Omen)
VITE_N8N_WEBHOOK_URL=https://n8n.omen.local/webhook/tabla
```

### 3.3 Obtener las credenciales del Omen

Solicita a Diego o al administrador del servidor las siguientes credenciales:

| Variable | Donde obtenerla |
|----------|----------------|
| `VITE_SUPABASE_URL` | URL del Supabase en Omen |
| `VITE_SUPABASE_ANON_KEY` | Clave anonima de Supabase |
| `VITE_N8N_WEBHOOK_URL` | URL del webhook de n8n |

> **Nota:** Las URLs mostradas arriba son ejemplos. El administrador te dara las URLs reales del servidor Omen.

---

## Paso 4: Iniciar la Aplicacion

```bash
npm run dev
```

**Resultado esperado:**
```
  VITE v5.x.x  ready in XXX ms

  ->  Local:   http://localhost:3000/
  ->  Network: http://XXX.XXX.X.XXX:3000/
```

### Abrir en el navegador

1. Abre tu navegador (Chrome, Firefox, Edge)
2. Ve a: **http://localhost:3000**
3. Deberia aparecer la interfaz de BidEval

---

## Verificar la Conexion

### Verificar Supabase

En la consola del navegador (F12 > Console), no deberian aparecer errores de conexion con Supabase.

### Verificar n8n

1. En BidEval, sube un archivo PDF de prueba
2. El archivo deberia procesarse correctamente
3. Si hay error de conexion, verifica la URL del webhook

---

## Comandos Utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Crear build de produccion |
| `npm run preview` | Previsualizar build de produccion |
| `npm run lint` | Verificar errores de codigo |

---

## Solucion de Problemas

### Error: "Cannot find module..."

```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules
npm install
```

### Error: "EACCES permission denied"

**Mac/Linux:**
```bash
sudo npm install
```

### Error de conexion con Supabase

1. Verifica que las credenciales en `.env.local` sean correctas
2. Asegurate de estar conectado a la red donde esta el servidor Omen
3. Si usas VPN, verifica que este activa

### Error de conexion con n8n

1. Verifica que la URL del webhook sea correcta
2. Asegurate de que el workflow en n8n este **activo**
3. Verifica la conexion de red con el servidor Omen

### El puerto 3000 esta ocupado

Vite automaticamente usara otro puerto (3001, 3002, etc.). Revisa el mensaje en la terminal.

---

## Estructura del Proyecto

```
bideval/
├── front-rfq/          # Frontend (React + Vite)
│   ├── src/            # Codigo fuente
│   ├── public/         # Archivos estaticos
│   ├── .env.local      # Tu configuracion local
│   └── package.json    # Dependencias
├── workflow n8n/       # Workflows de n8n (JSON)
├── dashboards/         # Dashboards adicionales
└── README.md           # Documentacion general
```

---

## Contacto y Soporte

Si tienes problemas con la instalacion:

1. **Problemas con credenciales:** Contacta al administrador del servidor Omen
2. **Errores de codigo:** Revisa la documentacion en el README.md
3. **Problemas de red:** Verifica tu conexion con el servidor Omen

---

## Notas Adicionales

- **No compartas** el archivo `.env.local` - contiene credenciales sensibles
- El archivo `.env.local` ya esta en `.gitignore`, no se subira a Git
- Si actualizas el proyecto con `git pull`, vuelve a ejecutar `npm install`
- La base de datos ya esta configurada en Supabase (Omen), no necesitas crear tablas

---

*Ultima actualizacion: Enero 2026*
