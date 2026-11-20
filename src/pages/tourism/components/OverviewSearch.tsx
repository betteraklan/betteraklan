import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { findMunicipalityAt } from '@/lib/tourism/geo';

import SearchBar from './SearchBar';
import { ALL_RECORDS, SOURCES } from './tourismData';

const TOWNS = [...SOURCES.municipalities]
  .map(m => ({ slug: m.slug, name: m.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Overview search, using Explore's SearchBar. Picking a suggestion opens it;
 * pressing Enter opens Explore's list with the query. "Near me" asks for
 * location only when tapped, and the position never leaves the device.
 */
export default function OverviewSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const nearMe = () => {
    if (!navigator.geolocation) {
      setMessage(
        "This browser can't share your location. You can still search or pick a town."
      );
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const slug = findMunicipalityAt(
          pos.coords.latitude,
          pos.coords.longitude,
          SOURCES.boundaries
        );
        if (!slug) {
          setMessage(
            'You seem to be outside Aklan. Search, or pick a town from Towns above.'
          );
          return;
        }
        navigate(`/tourism/explore?town=${slug}&view=map`);
      },
      err => {
        setLocating(false);
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location is off for this site. You can still search or pick a town.'
            : "We couldn't find your location. Try again, or search instead."
        );
      }
    );
  };

  return (
    <form
      role='search'
      aria-label='Search Aklan tourism'
      onSubmit={e => {
        e.preventDefault();
        const t = q.trim();
        navigate(
          t
            ? `/tourism/explore?q=${encodeURIComponent(t)}&view=list`
            : '/tourism/explore?view=list'
        );
      }}
    >
      <SearchBar
        value={q}
        onChange={setQ}
        records={ALL_RECORDS}
        towns={TOWNS}
        onPickRecord={r => navigate(`/tourism/explore?sel=${r.id}&view=map`)}
        onPickTown={slug => navigate(`/tourism/${slug}`)}
        onNearMe={nearMe}
        locating={locating}
      />
      <p
        role='status'
        aria-live='polite'
        className='text-kapwa-text-support type-meta mt-2 min-h-5 px-2'
      >
        {message}
      </p>
    </form>
  );
}
