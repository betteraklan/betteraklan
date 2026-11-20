import { BookmarkIcon } from 'lucide-react';

/**
 * Save / Saved toggle for My trip. The accessible name starts with the
 * visible word ("Save", "Saved") so voice users can say what they see.
 */
export default function SaveToTripButton({
  name,
  saved,
  onToggle,
}: {
  name: string;
  saved: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type='button'
      aria-pressed={saved}
      aria-label={
        saved ? `Saved ${name}. Remove from my trip` : `Save ${name} to my trip`
      }
      onClick={onToggle}
      className={`type-meta inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand ${saved ? 'bg-kapwa-bg-brand-weak border-kapwa-border-brand text-kapwa-text-brand' : 'bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong hover:border-kapwa-border-brand'}`}
    >
      <BookmarkIcon
        aria-hidden='true'
        className='h-4 w-4'
        fill={saved ? 'currentColor' : 'none'}
      />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
