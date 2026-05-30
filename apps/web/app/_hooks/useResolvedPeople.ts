'use client';

import { useMemo } from 'react';
import { useAuth } from '../_context/AuthCtx';
import { useSettings } from '../_context/SettingsCtx';
import { useTodo } from '../_context/TodoCtx';
import type { Person, PersonId } from '../_types';

/**
 * Returns the full people list from context, merging the current user's live
 * profile settings (name / color / photo) into their entry so every avatar
 * reflects in-flight changes without waiting for an API round-trip.
 */
export function useResolvedPeople(): Person[] {
  const { people } = useTodo();
  const { profile } = useSettings();
  const { personId } = useAuth();

  return useMemo(
    () =>
      people.map((person) => {
        if (person.id !== personId) return person;
        return {
          ...person,
          name: profile.name || person.name,
          color: profile.color || person.color,
          photo: profile.photo ?? person.photo,
          initials: (profile.name || person.name).trim().slice(0, 2).toUpperCase(),
        };
      }),
    [people, personId, profile.name, profile.color, profile.photo],
  );
}

export function useResolvedPerson(id: PersonId | null): Person | null {
  const people = useResolvedPeople();
  return useMemo(() => people.find((x) => x.id === id) || null, [people, id]);
}
