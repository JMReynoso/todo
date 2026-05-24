'use client';

import { useMemo } from 'react';
import { PEOPLE } from '../_data/constants';
import { useSettings } from '../_context/SettingsCtx';
import type { Person, PersonId } from '../_types';

/**
 * Merge live profile (name/color/photo) into the "me" entry so every avatar
 * of "me" across the app reflects current settings.
 */
export function useResolvedPeople(): Person[] {
  const { profile } = useSettings();
  return useMemo(
    () =>
      PEOPLE.map((person) => {
        if (person.id !== 'me') return person;
        const initial = (profile.name || 'Y').trim().slice(0, 1).toUpperCase();
        return {
          ...person,
          name: profile.name || person.name,
          color: profile.color || person.color,
          photo: profile.photo || null,
          initials: initial,
        };
      }),
    [profile.name, profile.color, profile.photo],
  );
}

export function useResolvedPerson(id: PersonId | null): Person | null {
  const people = useResolvedPeople();
  return useMemo(() => people.find((x) => x.id === id) || null, [people, id]);
}
