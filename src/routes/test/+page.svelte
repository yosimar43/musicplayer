<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { Button } from "$lib/components/ui/button";
  
  let logs: string[] = $state([]);
  let isLoading = $state(false);

  async function testGetDefaultMusicFolder() {
    addLog('🔍 Iniciando: get_default_music_folder()');
    isLoading = true;
    
    try {
      addLog('📂 Buscando la carpeta de música predeterminada del sistema...');
      const folder = await invoke<string>('get_default_music_folder');
      addLog(`✅ Carpeta encontrada: ${folder}`);
      addLog('');
      addLog('💡 EXPLICACIÓN:');
      addLog('- En Windows: Busca en %USERPROFILE%/Music');
      addLog('- En macOS/Linux: Busca en $HOME/Music');
      addLog('- Rust obtiene la variable de entorno del sistema');
      return folder;
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      throw error;
    } finally {
      isLoading = false;
    }
  }

  async function testScanMusicFolder() {
    addLog('🔍 Iniciando: scan_music_folder()');
    isLoading = true;
    
    try {
      // Primero obtener la carpeta
      const folder = await invoke<string>('get_default_music_folder');
      addLog(`📂 Escaneando carpeta: ${folder}`);
      addLog('');
      
      addLog('🔄 PROCESO DE ESCANEO:');
      addLog('1️⃣ Rust usa la librería "walkdir" para recorrer recursivamente');
      addLog('2️⃣ Filtra archivos por extensión: .mp3, .m4a, .flac, .wav, .ogg, .aac, .wma');
      addLog('3️⃣ Para cada archivo encontrado, llama a get_audio_metadata()');
      addLog('');
      
      const files = await invoke('scan_music_folder', { folderPath: folder });
      addLog(`✅ Archivos encontrados: ${JSON.stringify(files, null, 2)}`);
      addLog('');
      addLog('📊 DATOS RETORNADOS:');
      addLog('- path: Ruta completa del archivo');
      addLog('- title: Título extraído de metadata ID3/Vorbis');
      addLog('- artist: Artista');
      addLog('- album: Álbum');
      addLog('- duration: Duración en segundos');
      addLog('- year: Año de lanzamiento');
      addLog('- genre: Género musical');
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      isLoading = false;
    }
  }

  async function testGetMetadata() {
    addLog('🔍 Iniciando: get_audio_metadata()');
    addLog('');
    addLog('📖 LECTURA DE METADATA:');
    addLog('1️⃣ Rust abre el archivo usando la librería "audiotags"');
    addLog('2️⃣ audiotags detecta el formato automáticamente:');
    addLog('   - MP3: Lee tags ID3v1/ID3v2');
    addLog('   - FLAC: Lee Vorbis Comments');
    addLog('   - M4A: Lee iTunes metadata');
    addLog('   - OGG: Lee Vorbis Comments');
    addLog('3️⃣ Extrae campos estándar (title, artist, album, etc.)');
    addLog('4️⃣ Si falla, retorna solo el nombre del archivo');
    addLog('');
    addLog('🔐 SEGURIDAD:');
    addLog('- Tauri valida permisos en capabilities/default.json');
    addLog('- Solo permite leer, no escribir archivos');
    addLog('- Scope limitado a carpetas de audio/música');
  }

  async function explainArchitecture() {
    addLog('🏗️ ARQUITECTURA DEL SISTEMA:');
    addLog('');
    addLog('┌─────────────────────────────────────┐');
    addLog('│  FRONTEND (Svelte/TypeScript)      │');
    addLog('│  src/lib/utils/musicLibrary.ts      │');
    addLog('│  ↓ invoke("command", params)        │');
    addLog('└─────────────────────────────────────┘');
    addLog('          ↓ IPC (Inter-Process)');
    addLog('┌─────────────────────────────────────┐');
    addLog('│  TAURI CORE (Rust)                  │');
    addLog('│  src-tauri/src/lib.rs               │');
    addLog('│  ↓ #[tauri::command]                │');
    addLog('└─────────────────────────────────────┘');
    addLog('          ↓ System APIs');
    addLog('┌─────────────────────────────────────┐');
    addLog('│  SISTEMA OPERATIVO                  │');
    addLog('│  - File System API                  │');
    addLog('│  - Environment Variables            │');
    addLog('│  - Audio file codecs                │');
    addLog('└─────────────────────────────────────┘');
    addLog('');
    addLog('📦 LIBRERÍAS RUST USADAS:');
    addLog('- walkdir: Recursión de directorios');
    addLog('- audiotags: Parser de metadata de audio');
    addLog('- serde: Serialización JSON ↔ Rust');
    addLog('- tauri-plugin-fs: Acceso al file system');
    addLog('- tauri-plugin-dialog: Diálogos de selección');
    addLog('');
    addLog('⚡ FLUJO DE DATOS:');
    addLog('1. Usuario hace clic → Frontend llama invoke()');
    addLog('2. Tauri serializa parámetros a JSON');
    addLog('3. Backend Rust ejecuta comando');
    addLog('4. Rust lee archivos del sistema');
    addLog('5. audiotags parsea metadata binaria');
    addLog('6. Rust serializa resultado a JSON');
    addLog('7. Frontend recibe datos como TypeScript objects');
  }

  function addLog(message: string) {
    logs = [...logs, message];
  }

  function clearLogs() {
    logs = [];
  }
</script>

<div class="p-6 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold text-white mb-6">🎵 Test de Lectura de Música - Tauri</h1>
  
  <div class="flex gap-2 mb-6 flex-wrap">
    <Button onclick={testGetDefaultMusicFolder} disabled={isLoading}>
      1. Obtener Carpeta de Música
    </Button>
    <Button onclick={testScanMusicFolder} disabled={isLoading}>
      2. Escanear Archivos
    </Button>
    <Button onclick={testGetMetadata} disabled={isLoading}>
      3. Explicar Metadata
    </Button>
    <Button onclick={explainArchitecture} disabled={isLoading}>
      4. Arquitectura Completa
    </Button>
    <Button onclick={clearLogs} variant="outline">
      Limpiar
    </Button>
  </div>

  <div class="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400 min-h-96 max-h-96 overflow-y-auto">
    {#if logs.length === 0}
      <p class="text-gray-500">Haz clic en los botones para ver cómo funciona...</p>
    {:else}
      {#each logs as log}
        <div class="mb-1 whitespace-pre-wrap">{log}</div>
      {/each}
    {/if}
  </div>

  <div class="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300">
    <h3 class="font-bold mb-2">💡 Puntos Clave:</h3>
    <ul class="list-disc list-inside space-y-1 text-sm">
      <li>Tauri usa Rust para acceso nativo al sistema operativo</li>
      <li>La metadata se lee directamente de los archivos de audio (ID3, Vorbis, etc.)</li>
      <li>No necesita base de datos externa - todo se lee en tiempo real</li>
      <li>Comunicación segura entre Frontend (JS) y Backend (Rust) via IPC</li>
      <li>Permisos controlados por capabilities/default.json</li>
    </ul>
  </div>
</div>
