import {useEffect, useRef, useState} from 'react';
import type {SupabaseClient, User} from '@supabase/supabase-js';
import {courses} from './course-data';

export const accountsEnabled = true;
const courseCodes = new Set(courses.map(course => course.code));
const storageKey = 'cao-finder-offline-saved-v1';
const table = 'cao_saved_courses';
const storageWarning = 'Browser storage is unavailable. Your shortlist works for this session only.';
const accountClientPath = '/account-client.js?v=1';
const knownCodes = (codes: unknown[]) =>
  [...new Set(codes.filter((code): code is string => typeof code === 'string' && courseCodes.has(code)))];

export function useShortlist() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!accountsEnabled);
  const [authError, setAuthError] = useState('');
  const [guest, setGuest] = useState<string[]>([]);
  const [guestReady, setGuestReady] = useState(false);
  const [cloud, setCloud] = useState<{owner: string; codes: string[]} | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [cloudError, setCloudError] = useState('');
  const [busy, setBusy] = useState(false);
  const currentUser = useRef<string | null>(null);
  const request = useRef(0);
  const working = useRef(false);
  const guestCodes = useRef<string[]>([]);
  const userId = user?.id ?? null;
  const error = userId ? cloudError : guestError;
  const setError = userId ? setCloudError : setGuestError;

  function readGuest() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Invalid shortlist');
        guestCodes.current = knownCodes(parsed);
      }
      setGuestError('');
    } catch {
      setGuestError(storageWarning);
    }
    setGuest(guestCodes.current);
    setGuestReady(true);
  }

  useEffect(() => {
    readGuest();
    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return;
      guestCodes.current = [];
      readGuest();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!accountsEnabled) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void import(accountClientPath).then(({client}: {client: SupabaseClient}) => {
      if (disposed) return;
      setClient(client);
      const {data: {subscription}} = client.auth.onAuthStateChange((_event, session) => {
        const next = session?.user ?? null;
        if (currentUser.current !== (next?.id ?? null)) {
          currentUser.current = next?.id ?? null;
          request.current++;
          setCloud(null);
          setCloudError('');
          setCloudLoading(!!next);
        }
        setUser(next);
        setAuthReady(true);
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(() => {
      if (disposed) return;
      setAuthError('Account sign-in is temporarily unavailable. Please reload and try again.');
      setAuthReady(true);
    });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  async function loadSaved() {
    if (!userId || !client) {
      readGuest();
      return;
    }
    if (working.current) return;
    const id = ++request.current;
    setCloudLoading(true);
    setError('');
    try {
      const codes: string[] = [];
      const batchSize = 500;
      let after = '';
      while (true) {
        const {data, error} = await client.from(table).select('course_code')
          .eq('user_id', userId).gt('course_code', after).order('course_code').limit(batchSize);
        if (request.current !== id) return;
        if (error) throw error;
        codes.push(...data.map(row => row.course_code));
        if (data.length < batchSize) break;
        after = data[data.length - 1].course_code;
      }
      setCloud({owner: userId, codes: knownCodes(codes)});
    } catch {
      if (request.current === id) setError('Could not load your account shortlist. Please retry.');
    } finally {
      if (request.current === id) setCloudLoading(false);
    }
  }

  useEffect(() => {
    if (userId && client) void loadSaved();
  }, [userId, client]);

  const accountCodes = cloud?.owner === userId ? cloud?.codes : undefined;
  const loading = !authReady || !guestReady || cloudLoading;
  const saved = userId ? (accountCodes ?? []) : guest;

  async function changeCloud(codes: string[], removing: boolean) {
    if (!codes.length || !client || !userId || working.current || currentUser.current !== userId) return false;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const result = removing
        ? await client.from(table).delete().eq('user_id', userId).in('course_code', codes)
        : await client.from(table).upsert(codes.map(course_code => ({user_id: userId, course_code})),
            {onConflict: 'user_id,course_code', ignoreDuplicates: true});
      if (result.error) throw result.error;
      if (currentUser.current !== userId) return false;
      setCloud(previous => {
        if (previous?.owner !== userId) return previous;
        const next = removing ? previous.codes.filter(code => !codes.includes(code))
          : [...new Set([...previous.codes, ...codes])];
        return {owner: userId, codes: next};
      });
      return true;
    } catch {
      if (currentUser.current === userId) setError('Could not update your account shortlist. Please retry.');
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function toggleSaved(code: string) {
    if (loading || busy || (userId && !accountCodes)) return null;
    const removing = saved.includes(code);
    if (userId) return await changeCloud([code], removing) ? {removing, temporary: false} : null;

    const next = removing ? guestCodes.current.filter(value => value !== code) : [...new Set([...guestCodes.current, code])];
    guestCodes.current = next;
    setGuest(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setError('');
      return {removing, temporary: false};
    } catch {
      setError(storageWarning);
      return {removing, temporary: true};
    }
  }

  const importable = accountCodes ? guest.filter(code => !accountCodes.includes(code)) : [];

  return {
    client, user, authReady, authError, saved, loading, busy, error, setError, loadSaved, toggleSaved,
    canSave: !loading && !busy && (!userId || !!accountCodes),
    importable,
    importGuest: () => changeCloud(importable, false),
  };
}
