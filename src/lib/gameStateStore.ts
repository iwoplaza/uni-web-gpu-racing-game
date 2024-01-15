import { writable, type Writable } from 'svelte/store';
import type { GameState } from './common/systems/types';

const gameStateStore:  Writable<GameState | null>  = writable(null);

export default gameStateStore;
