import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  addStop,
  MAX_STOPS,
  moveStopInDays,
  parseTrip,
  parseTripDays,
  removeStop,
  serializeTrip,
  serializeTripDays,
  setStopDay,
} from './trip';
import {
  readSavedDays,
  readSavedTrip,
  TRIP_KEY,
  useSavedTrip,
} from './tripStore';

const known = new Set(['a', 'b', 'c', 'd', 'e']);

afterEach(() => localStorage.clear());

describe('trip days: links and saved trips from before days', () => {
  it('reads an old trip value as a single day, unchanged', () => {
    expect(parseTripDays('a,b,c', known)).toEqual([['a', 'b', 'c']]);
    expect(parseTrip('a,b,c', known)).toEqual(['a', 'b', 'c']);
    // A one-day trip is written exactly as before.
    expect(serializeTripDays([['a', 'b', 'c']])).toBe(
      serializeTrip(['a', 'b', 'c'])
    );
  });

  it('reads an old trip saved in this browser', () => {
    localStorage.setItem(TRIP_KEY, 'c,a');
    expect(readSavedDays(known)).toEqual([['c', 'a']]);
    expect(readSavedTrip(known)).toEqual(['c', 'a']);
  });
});

describe('trip days: the "|" format', () => {
  it('round-trips days', () => {
    const days = parseTripDays('a,b|c|d,e', known);
    expect(days).toEqual([['a', 'b'], ['c'], ['d', 'e']]);
    expect(serializeTripDays(days)).toBe('a,b|c|d,e');
    expect(parseTrip('a,b|c', known)).toEqual(['a', 'b', 'c']);
  });

  it('drops unknown ids, repeats and empty days, and caps the stops', () => {
    expect(parseTripDays('a,zz|a,b||', known)).toEqual([['a'], ['b']]);
    const many = new Set(Array.from({ length: 30 }, (_, i) => `s${i}`));
    const value =
      [...many].slice(0, 15).join(',') + '|' + [...many].slice(15).join(',');
    expect(parseTripDays(value, many).flat()).toHaveLength(MAX_STOPS);
  });
});

describe('trip days: editing', () => {
  const days = [
    ['a', 'b'],
    ['c', 'd'],
  ];

  it('adds to the last day and removes empty days', () => {
    expect(addStop(days, 'e')).toEqual([
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]);
    expect(addStop([], 'e')).toEqual([['e']]);
    expect(removeStop([['a'], ['c']], 'a')).toEqual([['c']]);
  });

  it('moves within a day, and across a day edge into the next day', () => {
    expect(moveStopInDays(days, 0, 1)).toEqual([
      ['b', 'a'],
      ['c', 'd'],
    ]);
    // b is last in Day 1: down moves it to Day 2, at the top.
    expect(moveStopInDays(days, 1, 1)).toEqual([['a'], ['b', 'c', 'd']]);
    // c is first in Day 2: up moves it to Day 1, at the end.
    expect(moveStopInDays(days, 2, -1)).toEqual([['a', 'b', 'c'], ['d']]);
    // Nothing beyond the ends.
    expect(moveStopInDays(days, 0, -1)).toBe(days);
    expect(moveStopInDays(days, 3, 1)).toBe(days);
  });

  it('puts a stop on another day or starts a new one', () => {
    expect(setStopDay(days, 'a', 1)).toEqual([['b'], ['c', 'd', 'a']]);
    expect(setStopDay(days, 'b', 2)).toEqual([['a'], ['c', 'd'], ['b']]);
    expect(setStopDay([['a']], 'a', 1)).toEqual([['a']]);
  });
});

describe('trip days: saving from town pages keeps the days', () => {
  it('a bookmark toggle adds to the last day and keeps the others', () => {
    localStorage.setItem(TRIP_KEY, 'a,b|c');
    const { result } = renderHook(() => useSavedTrip(known));
    act(() => {
      expect(result.current.toggle('d')).toBe('added');
    });
    expect(localStorage.getItem(TRIP_KEY)).toBe('a,b|c,d');
    act(() => {
      expect(result.current.toggle('a')).toBe('removed');
    });
    expect(localStorage.getItem(TRIP_KEY)).toBe('b|c,d');
    expect(result.current.days).toEqual([['b'], ['c', 'd']]);
    expect(result.current.ids).toEqual(['b', 'c', 'd']);
  });
});
