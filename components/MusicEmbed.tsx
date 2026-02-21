
import React from 'react';
import { MusicTrack } from '../types';

interface MusicEmbedProps {
  track: MusicTrack;
  isActive: boolean;
  volume: number;
}

const MusicEmbed: React.FC<MusicEmbedProps> = ({ track, isActive, volume }) => {
  if (!isActive) return null;

  const getEmbedUrl = () => {
    if (track.type === 'youtube') {
      // Extrair ID do vídeo
      let videoId = '';
      if (track.url.includes('v=')) {
        videoId = track.url.split('v=')[1].split('&')[0];
      } else if (track.url.includes('youtu.be/')) {
        videoId = track.url.split('youtu.be/')[1].split('?')[0];
      } else if (track.url.includes('/embed/')) {
        videoId = track.url.split('/embed/')[1].split('?')[0];
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${volume === 0 ? 1 : 0}`;
    }

    return '';
  };

  const embedUrl = getEmbedUrl();
  if (!embedUrl) return null;

  return (
    <div className="w-full mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-black">
      <iframe
        src={embedUrl}
        width="100%"
        height="180"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="opacity-90 hover:opacity-100 transition-opacity"
      ></iframe>
    </div>
  );
};

export default MusicEmbed;
