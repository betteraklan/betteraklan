import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Banner } from '@bettergov/kapwa/banner';
import { Button } from '@bettergov/kapwa/button';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';

import municipalitiesData from '@/data/tourism/municipalities.json';
import { advisoryPhase } from '@/lib/tourism/advisoryWindow';
import {
  AdvisoryApiError,
  type AdminAdvisory,
  type AdvisoryFormValues,
  advisoriesAdminApi,
  emptyForm,
  formErrors,
  toForm,
  toPayload,
} from '@/lib/tourism/advisoriesAdmin';
import type { Advisory } from '@/types/tourism';

const MUNICIPALITIES = (
  municipalitiesData as Array<{ slug: string; name: string }>
)
  .map(({ slug, name }) => ({ slug, name }))
  .sort((a, b) => a.name.localeCompare(b.name));
const TOWN_NAME = new Map(MUNICIPALITIES.map(m => [m.slug, m.name]));

const KIND_LABEL: Record<Advisory['kind'], string> = {
  closure: 'Closure',
  access: 'Access change',
  event: 'Event',
};

type Status = 'live' | 'scheduled' | 'ended' | 'unpublished' | 'invalid';
type Filter = 'all' | Status;

const STATUS: Record<
  Status,
  { label: string; badge: 'success' | 'warning' | 'slate' | 'error' }
> = {
  live: { label: 'Live', badge: 'success' },
  scheduled: { label: 'Scheduled', badge: 'warning' },
  ended: { label: 'Ended', badge: 'slate' },
  unpublished: { label: 'Unpublished', badge: 'slate' },
  invalid: { label: 'Bad dates', badge: 'error' },
};

function statusOf(a: AdminAdvisory, now: number): Status {
  if (!a.isPublished) return 'unpublished';
  return advisoryPhase(a, now) ?? 'invalid';
}

function formatWhen(value: string): string {
  return value.includes('T')
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date(`${value}T00:00:00+08:00`).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
      });
}

type BannerState = { message: string; type: 'success' | 'error' } | null;

export default function TourismAdvisories() {
  const [advisories, setAdvisories] = useState<AdminAdvisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [banner, setBanner] = useState<BannerState>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminAdvisory | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setAdvisories(await advisoriesAdminApi.list());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load advisories'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const withStatus = useMemo(
    () => advisories.map(a => ({ advisory: a, status: statusOf(a, now) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute with data, not every tick
    [advisories]
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: withStatus.length,
      live: 0,
      scheduled: 0,
      ended: 0,
      unpublished: 0,
      invalid: 0,
    };
    for (const { status } of withStatus) c[status]++;
    return c;
  }, [withStatus]);
  const shown =
    filter === 'all'
      ? withStatus
      : withStatus.filter(({ status }) => status === filter);

  const upsert = (saved: AdminAdvisory) =>
    setAdvisories(list =>
      list.some(a => a.id === saved.id)
        ? list.map(a => (a.id === saved.id ? saved : a))
        : [saved, ...list]
    );

  const togglePublished = async (a: AdminAdvisory) => {
    setToggling(a.id);
    try {
      const saved = await advisoriesAdminApi.update(a.id, {
        isPublished: !a.isPublished,
      });
      upsert(saved);
      setBanner({
        type: 'success',
        message: saved.isPublished
          ? `Published “${saved.title}”. It shows on the site within a couple of minutes.`
          : `Unpublished “${saved.title}”. It disappears from the site within a couple of minutes.`,
      });
    } catch (error) {
      setBanner({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Could not update advisory',
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className='space-y-6'>
      {banner && (
        <Banner
          type={banner.type}
          description={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-kapwa-text-strong text-2xl font-bold'>
            Tourism Advisories
          </h2>
          <p className='text-kapwa-text-support'>
            Closures, access changes and events shown on the tourism map and
            municipality pages
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <label className='sr-only' htmlFor='advisory-filter'>
            Show
          </label>
          <select
            id='advisory-filter'
            value={filter}
            onChange={e => setFilter(e.target.value as Filter)}
            className='border-kapwa-border-weak bg-kapwa-bg-surface rounded-md border px-3 py-2 text-sm'
          >
            {(
              ['all', 'live', 'scheduled', 'ended', 'unpublished'] as const
            ).map(f => (
              <option key={f} value={f}>
                {f === 'all' ? 'All' : STATUS[f].label} ({counts[f]})
              </option>
            ))}
            {counts.invalid > 0 && (
              <option value='invalid'>Bad dates ({counts.invalid})</option>
            )}
          </select>
          <Button
            variant='outline'
            size='sm'
            leftIcon={<RefreshCw className='h-4 w-4' />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant='primary'
            size='sm'
            leftIcon={<Plus className='h-4 w-4' />}
            onClick={() => setEditing('new')}
          >
            New advisory
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <RefreshCw
            aria-label='Loading advisories'
            className='text-kapwa-text-disabled h-8 w-8 animate-spin'
          />
        </div>
      ) : loadError ? (
        <Banner
          type='error'
          title='Could not load advisories'
          description={loadError}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={
            filter === 'all' ? 'No advisories yet' : 'Nothing in this view'
          }
          message={
            filter === 'all'
              ? 'Create one when a closure, access change or event affects visitors.'
              : 'Try another filter.'
          }
          icon={Megaphone}
        />
      ) : (
        <ul className='space-y-4'>
          {shown.map(({ advisory: a, status }) => (
            <li key={a.id}>
              <Card variant='default'>
                <CardContent className='p-5'>
                  <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                    <div className='min-w-0 flex-1 space-y-2'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant={STATUS[status].badge}>
                          {STATUS[status].label}
                        </Badge>
                        <Badge variant='outline'>{KIND_LABEL[a.kind]}</Badge>
                        <span className='text-kapwa-text-support text-sm'>
                          {a.affects.municipality
                            ? (TOWN_NAME.get(a.affects.municipality) ??
                              a.affects.municipality)
                            : 'Province-wide'}
                          {a.affects.place ? ` · ${a.affects.place}` : ''}
                        </span>
                      </div>
                      <h3 className='text-kapwa-text-strong font-bold break-words'>
                        {a.title}
                      </h3>
                      <p className='text-kapwa-text-support text-sm break-words'>
                        {a.summary}
                      </p>
                      <p className='text-kapwa-text-disabled text-xs'>
                        {a.issuer} · from {formatWhen(a.publishedAt)}
                        {a.endsAt
                          ? ` until ${formatWhen(a.endsAt)}`
                          : ' · no end date'}
                      </p>
                      <a
                        href={a.sourceUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-kapwa-text-brand inline-flex items-center gap-1 text-sm hover:underline'
                      >
                        Source
                        <ExternalLink aria-hidden='true' className='h-3 w-3' />
                      </a>
                    </div>
                    <div className='flex shrink-0 gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        leftIcon={<Pencil className='h-4 w-4' />}
                        onClick={() => setEditing(a)}
                        aria-label={`Edit “${a.title}”`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={a.isPublished ? 'outline' : 'primary'}
                        size='sm'
                        leftIcon={
                          a.isPublished ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )
                        }
                        onClick={() => togglePublished(a)}
                        disabled={toggling === a.id}
                        aria-label={`${a.isPublished ? 'Unpublish' : 'Publish'} “${a.title}”`}
                      >
                        {toggling === a.id
                          ? 'Saving…'
                          : a.isPublished
                            ? 'Unpublish'
                            : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AdvisoryDialog
          advisory={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            upsert(saved);
            setEditing(null);
            setBanner({
              type: 'success',
              message: `${created ? 'Created' : 'Saved'} “${saved.title}”.${
                saved.isPublished
                  ? ' It shows on the site within a couple of minutes.'
                  : ' It is not published yet.'
              }`,
            });
          }}
        />
      )}
    </div>
  );
}

type FieldErrors = Partial<Record<keyof AdvisoryFormValues, string>>;

function AdvisoryDialog({
  advisory,
  onClose,
  onSaved,
}: {
  advisory: AdminAdvisory | null;
  onClose: () => void;
  onSaved: (saved: AdminAdvisory, created: boolean) => void;
}) {
  const [form, setForm] = useState<AdvisoryFormValues>(() =>
    advisory ? toForm(advisory) : emptyForm()
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AdvisoryFormValues>(
    key: K,
    value: AdvisoryFormValues[K]
  ) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = toPayload(form);
      const saved = advisory
        ? await advisoriesAdminApi.update(advisory.id, payload)
        : await advisoriesAdminApi.create(payload);
      onSaved(saved, !advisory);
    } catch (error) {
      if (error instanceof AdvisoryApiError && error.status === 400) {
        setErrors(formErrors(error.fieldErrors));
        setFormError('Please fix the highlighted fields.');
      } else {
        setFormError(
          error instanceof Error ? error.message : 'Could not save advisory'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const input =
    'border-kapwa-border-weak bg-kapwa-bg-surface w-full rounded-md border px-3 py-2 text-sm aria-[invalid=true]:border-rose-500';

  const field = (
    key: keyof AdvisoryFormValues,
    label: string,
    control: (props: {
      id: string;
      'aria-invalid': boolean;
      'aria-describedby'?: string;
      className: string;
    }) => ReactNode,
    hint?: string
  ) => {
    const id = `advisory-${key}`;
    const describedBy =
      [errors[key] && `${id}-error`, hint && `${id}-hint`]
        .filter(Boolean)
        .join(' ') || undefined;
    return (
      <div className='space-y-1'>
        <label
          htmlFor={id}
          className='text-kapwa-text-strong block text-sm font-semibold'
        >
          {label}
        </label>
        {control({
          id,
          'aria-invalid': Boolean(errors[key]),
          'aria-describedby': describedBy,
          className: input,
        })}
        {hint && (
          <p id={`${id}-hint`} className='text-kapwa-text-disabled text-xs'>
            {hint}
          </p>
        )}
        {errors[key] && (
          <p id={`${id}-error`} className='text-xs text-rose-700'>
            {errors[key]}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {advisory ? 'Edit advisory' : 'New advisory'}
          </DialogTitle>
          <DialogDescription>
            Times are Philippine time. Leave the time empty to cover the whole
            day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className='space-y-4' noValidate>
          {formError && (
            <p
              role='alert'
              className='rounded-md bg-rose-50 p-3 text-sm text-rose-800'
            >
              {formError}
            </p>
          )}

          <div className='grid gap-4 sm:grid-cols-2'>
            {field('kind', 'Type', p => (
              <select
                {...p}
                value={form.kind}
                onChange={e => set('kind', e.target.value as Advisory['kind'])}
              >
                {Object.entries(KIND_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ))}
            {field('municipality', 'Municipality', p => (
              <select
                {...p}
                value={form.municipality}
                onChange={e => set('municipality', e.target.value)}
              >
                <option value=''>Province-wide</option>
                {MUNICIPALITIES.map(m => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {field('title', 'Title', p => (
            <input
              {...p}
              required
              maxLength={200}
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          ))}
          {field('summary', 'Summary', p => (
            <textarea
              {...p}
              required
              rows={3}
              maxLength={2000}
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
            />
          ))}

          <div className='grid gap-4 sm:grid-cols-2'>
            {field(
              'place',
              'Place (optional)',
              p => (
                <input
                  {...p}
                  maxLength={200}
                  value={form.place}
                  onChange={e => set('place', e.target.value)}
                />
              ),
              'e.g. Caticlan Jetty Port'
            )}
            {field('issuer', 'Issued by', p => (
              <input
                {...p}
                required
                maxLength={200}
                value={form.issuer}
                onChange={e => set('issuer', e.target.value)}
              />
            ))}
          </div>

          {field(
            'sourceUrl',
            'Source link',
            p => (
              <input
                {...p}
                type='url'
                required
                inputMode='url'
                placeholder='https://'
                value={form.sourceUrl}
                onChange={e => set('sourceUrl', e.target.value)}
              />
            ),
            'Link to the official post or memo'
          )}

          <div className='grid grid-cols-2 gap-4'>
            {field('startDate', 'Starts', p => (
              <input
                {...p}
                type='date'
                required
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            ))}
            {field('startTime', 'Time (optional)', p => (
              <input
                {...p}
                type='time'
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
              />
            ))}
            {field('endDate', 'Ends (optional)', p => (
              <input
                {...p}
                type='date'
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            ))}
            {field('endTime', 'Time (optional)', p => (
              <input
                {...p}
                type='time'
                disabled={!form.endDate}
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
              />
            ))}
          </div>

          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={form.isPublished}
              onChange={e => set('isPublished', e.target.checked)}
            />
            Published (visible on the site during its dates)
          </label>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type='submit' variant='primary' disabled={saving}>
              {saving ? 'Saving…' : advisory ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
