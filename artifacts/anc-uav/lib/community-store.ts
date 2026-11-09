import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import bundledJson from '../data/ourairports-australia.json';
import { validateCommunitySnapshot } from './community-aviation';
import { createCommunityCache } from './community-cache';
import { downloadCommunitySnapshot } from './community-download';

export const communityStore = createCommunityCache(AsyncStorage, validateCommunitySnapshot(bundledJson), downloadCommunitySnapshot);
export function useCommunityAviation() {
  return useSyncExternalStore(communityStore.subscribe, communityStore.get, communityStore.get);
}
