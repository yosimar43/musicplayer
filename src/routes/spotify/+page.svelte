<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { Music, User, Disc3, ListMusic, Loader2, PlayCircle } from 'lucide-svelte';
	
	interface SpotifyUserProfile {
		id: string;
		display_name: string | null;
		email: string | null;
		country: string | null;
		product: string | null;
		followers: number;
		images: string[];
	}

	interface SpotifyPlaylist {
		id: string;
		name: string;
		description: string | null;
		owner: string;
		tracks_total: number;
		images: string[];
		public: boolean | null;
	}

	interface SpotifyTrack {
		id: string | null;
		name: string;
		artists: string[];
		album: string;
		duration_ms: number;
		popularity: number | null;
		preview_url: string | null;
		external_url: string | null;
	}

	interface SpotifyCurrentPlayback {
		is_playing: boolean;
		track: SpotifyTrack | null;
		progress_ms: number | null;
		device_name: string | null;
		shuffle_state: boolean;
		repeat_state: string;
	}

	let isAuthenticated = $state(false);
	let isAuthenticating = $state(false);
	let profile = $state<SpotifyUserProfile | null>(null);
	let playlists = $state<SpotifyPlaylist[]>([]);
	let savedTracks = $state<SpotifyTrack[]>([]);
	let currentPlayback = $state<SpotifyCurrentPlayback | null>(null);
	let error = $state<string | null>(null);
	let activeTab = $state<'profile' | 'playlists' | 'tracks' | 'playback'>('profile');

	onMount(async () => {
		await checkAuthentication();
	});

	async function checkAuthentication() {
		try {
			isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
			if (isAuthenticated) {
				await loadProfile();
			}
		} catch (err) {
			console.error('Error checking authentication:', err);
		}
	}

	async function authenticate() {
		isAuthenticating = true;
		error = null;
		try {
			await invoke('spotify_authenticate');
			isAuthenticated = true;
			await loadProfile();
		} catch (err: any) {
			error = err.toString();
			console.error('Error authenticating:', err);
		} finally {
			isAuthenticating = false;
		}
	}

	async function loadProfile() {
		try {
			profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
		} catch (err: any) {
			error = err.toString();
			console.error('Error loading profile:', err);
		}
	}

	async function loadPlaylists() {
		try {
			playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', { limit: 50 });
		} catch (err: any) {
			error = err.toString();
			console.error('Error loading playlists:', err);
		}
	}

	async function loadSavedTracks() {
		try {
			savedTracks = await invoke<SpotifyTrack[]>('spotify_get_saved_tracks', { limit: 50 });
		} catch (err: any) {
			error = err.toString();
			console.error('Error loading saved tracks:', err);
		}
	}

	async function loadCurrentPlayback() {
		try {
			currentPlayback = await invoke<SpotifyCurrentPlayback | null>('spotify_get_current_playback');
		} catch (err: any) {
			error = err.toString();
			console.error('Error loading playback:', err);
		}
	}

	async function logout() {
		try {
			await invoke('spotify_logout');
			isAuthenticated = false;
			profile = null;
			playlists = [];
			savedTracks = [];
			currentPlayback = null;
		} catch (err: any) {
			error = err.toString();
			console.error('Error logging out:', err);
		}
	}

	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		if (activeTab === 'playlists' && playlists.length === 0 && isAuthenticated) {
			loadPlaylists();
		} else if (activeTab === 'tracks' && savedTracks.length === 0 && isAuthenticated) {
			loadSavedTracks();
		} else if (activeTab === 'playback' && isAuthenticated) {
			loadCurrentPlayback();
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-green-900 via-black to-black p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white mb-2 flex items-center gap-3">
				<Music class="text-green-400" size={40} />
				Spotify Integration
			</h1>
			<p class="text-gray-400">Conecta con tu cuenta de Spotify usando RSpotify</p>
		</div>

		{#if !isAuthenticated}
			<!-- Login Screen -->
			<div class="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
				<div class="text-center">
					<div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<Music class="text-green-400" size={48} />
					</div>
					<h2 class="text-2xl font-bold text-white mb-2">Conecta tu cuenta</h2>
					<p class="text-gray-400 mb-6">Autoriza la aplicación para acceder a tus datos de Spotify</p>
					
					<button
						onclick={authenticate}
						disabled={isAuthenticating}
						class="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
					>
						{#if isAuthenticating}
							<Loader2 class="animate-spin" size={20} />
							Autenticando...
						{:else}
							<Music size={20} />
							Conectar con Spotify
						{/if}
					</button>

					{#if error}
						<div class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
							<p class="text-red-400 text-sm">{error}</p>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="flex gap-2 mb-6">
				<button
					onclick={() => activeTab = 'profile'}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						activeTab === 'profile'
							? 'bg-green-500 text-white'
							: 'bg-white/5 text-gray-400 hover:bg-white/10'
					}`}
				>
					<User size={18} class="inline mr-2" />
					Perfil
				</button>
				<button
					onclick={() => activeTab = 'playlists'}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						activeTab === 'playlists'
							? 'bg-green-500 text-white'
							: 'bg-white/5 text-gray-400 hover:bg-white/10'
					}`}
				>
					<ListMusic size={18} class="inline mr-2" />
					Playlists
				</button>
				<button
					onclick={() => activeTab = 'tracks'}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						activeTab === 'tracks'
							? 'bg-green-500 text-white'
							: 'bg-white/5 text-gray-400 hover:bg-white/10'
					}`}
				>
					<Disc3 size={18} class="inline mr-2" />
					Canciones Guardadas
				</button>
				<button
					onclick={() => activeTab = 'playback'}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						activeTab === 'playback'
							? 'bg-green-500 text-white'
							: 'bg-white/5 text-gray-400 hover:bg-white/10'
					}`}
				>
					<PlayCircle size={18} class="inline mr-2" />
					Reproduciendo
				</button>
				<button
					onclick={logout}
					class="ml-auto px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
				>
					Cerrar Sesión
				</button>
			</div>

			{#if error}
				<div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
					<p class="text-red-400 text-sm">{error}</p>
				</div>
			{/if}

			<!-- Profile Tab -->
			{#if activeTab === 'profile' && profile}
				<div class="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
					<div class="flex items-start gap-6">
						{#if profile.images[0]}
							<img src={profile.images[0]} alt={profile.display_name || 'Profile'} class="w-32 h-32 rounded-full" />
						{:else}
							<div class="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center">
								<User class="text-green-400" size={64} />
							</div>
						{/if}
						<div class="flex-1">
							<h2 class="text-3xl font-bold text-white mb-2">{profile.display_name || 'Sin nombre'}</h2>
							<div class="space-y-2 text-gray-300">
								{#if profile.email}
									<p>📧 {profile.email}</p>
								{/if}
								{#if profile.country}
									<p>🌍 {profile.country}</p>
								{/if}
								{#if profile.product}
									<p>💎 {profile.product}</p>
								{/if}
								<p>👥 {profile.followers.toLocaleString()} seguidores</p>
								<p class="text-sm text-gray-500">ID: {profile.id}</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Playlists Tab -->
			{#if activeTab === 'playlists'}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each playlists as playlist}
						<div class="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
							{#if playlist.images[0]}
								<img src={playlist.images[0]} alt={playlist.name} class="w-full aspect-square object-cover rounded-lg mb-3" />
							{:else}
								<div class="w-full aspect-square bg-green-500/20 rounded-lg mb-3 flex items-center justify-center">
									<ListMusic class="text-green-400" size={48} />
								</div>
							{/if}
							<h3 class="text-white font-semibold mb-1 truncate">{playlist.name}</h3>
							<p class="text-gray-400 text-sm mb-2 line-clamp-2">{playlist.description || 'Sin descripción'}</p>
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>Por {playlist.owner}</span>
								<span>{playlist.tracks_total} canciones</span>
							</div>
						</div>
					{:else}
						<p class="text-gray-400 col-span-full text-center py-8">No se encontraron playlists</p>
					{/each}
				</div>
			{/if}

			<!-- Saved Tracks Tab -->
			{#if activeTab === 'tracks'}
				<div class="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
					<div class="divide-y divide-white/10">
						{#each savedTracks as track, i}
							<div class="p-4 hover:bg-white/5 transition-colors flex items-center gap-4">
								<span class="text-gray-500 w-8 text-center">{i + 1}</span>
								<Disc3 class="text-green-400" size={24} />
								<div class="flex-1 min-w-0">
									<p class="text-white font-medium truncate">{track.name}</p>
									<p class="text-gray-400 text-sm truncate">{track.artists.join(', ')}</p>
								</div>
								<div class="text-right">
									<p class="text-gray-400 text-sm">{track.album}</p>
									<p class="text-gray-500 text-xs">{formatDuration(track.duration_ms)}</p>
								</div>
								{#if track.popularity}
									<span class="text-green-400 text-sm">{track.popularity}%</span>
								{/if}
							</div>
						{:else}
							<p class="text-gray-400 text-center py-8">No se encontraron canciones guardadas</p>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Current Playback Tab -->
			{#if activeTab === 'playback'}
				{#if currentPlayback}
					<div class="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
						{#if currentPlayback.track}
							<div class="flex items-start gap-6">
								<div class="w-48 h-48 bg-green-500/20 rounded-lg flex items-center justify-center">
									<Disc3 class="text-green-400 animate-spin" size={96} style="animation-duration: 3s;" />
								</div>
								<div class="flex-1">
									<h2 class="text-3xl font-bold text-white mb-2">{currentPlayback.track.name}</h2>
									<p class="text-xl text-gray-300 mb-4">{currentPlayback.track.artists.join(', ')}</p>
									<p class="text-lg text-gray-400 mb-6">{currentPlayback.track.album}</p>
									
									<div class="space-y-2 text-gray-300">
										<p>▶️ {currentPlayback.is_playing ? 'Reproduciendo' : 'Pausado'}</p>
										{#if currentPlayback.device_name}
											<p>📱 {currentPlayback.device_name}</p>
										{/if}
										<p>🔀 Aleatorio: {currentPlayback.shuffle_state ? 'Activado' : 'Desactivado'}</p>
										<p>🔁 Repetir: {currentPlayback.repeat_state}</p>
										{#if currentPlayback.progress_ms}
											<p>⏱️ {formatDuration(currentPlayback.progress_ms)} / {formatDuration(currentPlayback.track.duration_ms)}</p>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<p class="text-gray-400 text-center py-8">No hay información de la canción actual</p>
						{/if}
					</div>
				{:else}
					<div class="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
						<p class="text-gray-400 text-center">No hay reproducción activa</p>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>
