<script lang="ts">
  import { MusicCard3D } from "$lib/components/tracks";
  import type { Track } from "$lib/types/music";

  // Sample tracks for demo
  const sampleTracks: Track[] = [
    {
      path: "/demo/track1.mp3",
      title: "Neon Dreams",
      artist: "Synthwave Collective",
      album: "Retro Future",
      duration: 245,
      year: 2024,
      genre: "Synthwave",
      albumArt: "https://picsum.photos/seed/album1/400/400",
    },
    {
      path: "/demo/track2.mp3",
      title: "Midnight City Lights",
      artist: "Electronic Horizons",
      album: "Urban Soundscapes",
      duration: 198,
      year: 2024,
      genre: "Electronic",
      albumArt: "https://picsum.photos/seed/album2/400/400",
    },
    {
      path: "/demo/track3.mp3",
      title: "Cosmic Journey",
      artist: "Space Explorers",
      album: "Beyond the Stars",
      duration: 312,
      year: 2023,
      genre: "Ambient",
      albumArt: "https://picsum.photos/seed/album3/400/400",
    },
    {
      path: "/demo/track4.mp3",
      title: "Track Without Album Art",
      artist: "Unknown Artist",
      album: null,
      duration: 180,
      year: null,
      genre: null,
      albumArt: null,
    },
  ];
</script>

<div class="demo-container">
  <div class="demo-header">
    <h1>3D Music Card Demo</h1>
    <p>Hover over the cards to see the 3D effects and animations</p>
  </div>

  <div class="cards-grid">
    {#each sampleTracks as track (track.path)}
      <MusicCard3D {track} />
    {/each}
  </div>
</div>

<style>
  .demo-container {
    min-height: 100vh;
    padding: 40px 20px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  }

  .demo-header {
    text-align: center;
    margin-bottom: 60px;
    color: white;
  }

  .demo-header h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .demo-header p {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 40px;
    max-width: 1400px;
    margin: 0 auto;
    justify-items: center;
  }

  @media (max-width: 600px) {
    .demo-header h1 {
      font-size: 2rem;
    }

    .demo-header p {
      font-size: 1rem;
    }

    .cards-grid {
      grid-template-columns: 1fr;
      gap: 30px;
    }
  }
</style>
