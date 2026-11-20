import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_STOPS } from './trip';
import { readSavedTrip, saveTrip, TRIP_KEY, useSavedTrip } from './tripStore';

const known = new Set(['a', 'b', 'c']);

describe('trip store', () => {
  beforeEach(() => localStorage.clear());

  it('reads only known ids, in order, without duplicates', () => {
    localStorage.setItem(TRIP_KEY, 'b,zzz,a,b');
    expect(readSavedTrip(known)).toEqual(['b', 'a']);
  });

  it('clearing the trip removes the stored value', () => {
    saveTrip(['a']);
    saveTrip([]);
    expect(localStorage.getItem(TRIP_KEY)).toBeNull();
  });

  it('toggle adds, removes and stops at the limit', () => {
    const { result } = renderHook(() => useSavedTrip(known));
    let r: string = '';
    act(() => {
      r = result.current.toggle('a');
    });
    expect(r).toBe('added');
    expect(result.current.ids).toEqual(['a']);
    act(() => {
      r = result.current.toggle('a');
    });
    expect(r).toBe('removed');
    expect(result.current.ids).toEqual([]);

    const many = new Set(
      Array.from({ length: MAX_STOPS + 1 }, (_, i) => `s${i}`)
    );
    saveTrip([...many].slice(0, MAX_STOPS));
    const full = renderHook(() => useSavedTrip(many));
    act(() => {
      r = full.result.current.toggle(`s${MAX_STOPS}`);
    });
    expect(r).toBe('full');
  });
});
