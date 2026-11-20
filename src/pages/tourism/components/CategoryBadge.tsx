import {
  DropletsIcon,
  LandmarkIcon,
  MountainIcon,
  TagIcon,
  TreesIcon,
  WavesIcon,
} from 'lucide-react';

import type { Category } from '@/lib/tourism/category';

const ICON = {
  Beach: WavesIcon,
  Falls: DropletsIcon,
  Cave: MountainIcon,
  Culture: LandmarkIcon,
  Nature: TreesIcon,
  Other: TagIcon,
} as const;

/** The category as an icon and its word, so it never relies on colour. */
export default function CategoryBadge({ category }: { category: Category }) {
  const Icon = ICON[category];
  return (
    <span className='type-meta bg-kapwa-bg-surface-raised border-kapwa-border-weak text-kapwa-text-strong inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold'>
      <Icon aria-hidden='true' className='h-4 w-4 shrink-0' />
      {category}
    </span>
  );
}
