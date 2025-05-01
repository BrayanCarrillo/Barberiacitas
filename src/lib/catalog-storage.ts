"use client";

import type { Service, Product, Combo } from '@/types';

const SERVICES_STORAGE_KEY_PREFIX = 'barberEaseBarberServices_';
const PRODUCTS_STORAGE_KEY_PREFIX = 'barberEaseBarberProducts_';
const COMBOS_STORAGE_KEY_PREFIX = 'barberEaseBarberCombos_';

// --- Helper Functions ---

function getStorageKey(prefix: string, barberId: string): string {
  return `${prefix}${barberId}`;
}

function getData<T>(prefix: string, barberId: string, defaults: T[] = []): T[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return defaults;
  }
  const storageKey = getStorageKey(prefix, barberId);
  try {
    const storedData = localStorage.getItem(storageKey);
    return storedData ? JSON.parse(storedData) : defaults;
  } catch (error) {
    console.error(`Error retrieving data from local storage (key: ${storageKey}):`, error);
    return defaults;
  }
}

function saveData<T>(prefix: string, barberId: string, data: T[]): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn(`Cannot save data (prefix: ${prefix}): Local storage is not available.`);
    return false;
  }
  const storageKey = getStorageKey(prefix, barberId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`Data saved successfully to key: ${storageKey}`);
     // Dispatch a custom event to notify other components
     window.dispatchEvent(new CustomEvent('catalogChanged', { detail: { barberId, type: prefix } }));
    return true;
  } catch (error) {
    console.error(`Error saving data to local storage (key: ${storageKey}):`, error);
    return false;
  }
}

// --- Default Data (Adjusted for COP) ---
export const defaultServices: Service[] = [
  { id: 'haircut', type: 'service', name: 'Corte de pelo', duration: 30, price: 25000 },
  { id: 'beard_trim', type: 'service', name: 'Recorte de barba', duration: 20, price: 15000 },
  { id: 'haircut_beard', type: 'service', name: 'Corte de pelo y barba', duration: 50, price: 35000 },
  { id: 'shave', type: 'service', name: 'Afeitado con toalla caliente', duration: 40, price: 30000 },
];

export const defaultProducts: Product[] = [
    { id: 'wax', type: 'product', name: 'Cera para peinar', price: 15000, description: 'Fijación fuerte, acabado mate.' },
    { id: 'comb', type: 'product', name: 'Peine clásico', price: 5000 },
];

export const defaultCombos: Combo[] = [
    { id: 'combo_hb', type: 'combo', name: 'Combo Corte y Barba Especial', serviceIds: ['haircut', 'beard_trim'], price: 38000 }
];


// --- Services ---

export function getBarberServices(barberId: string): Service[] {
  return getData<Service>(SERVICES_STORAGE_KEY_PREFIX, barberId, defaultServices);
}

export function saveBarberServices(barberId: string, services: Service[]): boolean {
  return saveData<Service>(SERVICES_STORAGE_KEY_PREFIX, barberId, services);
}

export function addBarberService(barberId: string, service: Service): boolean {
  const services = getBarberServices(barberId);
  return saveBarberServices(barberId, [...services, service]);
}

export function updateBarberService(barberId: string, updatedService: Service): boolean {
    const services = getBarberServices(barberId);
    const index = services.findIndex(s => s.id === updatedService.id);
    if (index === -1) return false; // Service not found
    const newServices = [...services];
    newServices[index] = updatedService;
    return saveBarberServices(barberId, newServices);
}

export function removeBarberService(barberId: string, serviceId: string): boolean {
    const services = getBarberServices(barberId);
    const combos = getBarberCombos(barberId);

    // Check if service is used in any combos
    const isUsedInCombo = combos.some(combo => combo.serviceIds.includes(serviceId));
    if (isUsedInCombo) {
        console.warn(`Cannot remove service ${serviceId}: It is used in one or more combos.`);
        // You might want to throw an error or return a specific status code/message
        return false; // Prevent deletion
    }

    const newServices = services.filter(s => s.id !== serviceId);
    return saveBarberServices(barberId, newServices);
}


// --- Products ---

export function getBarberProducts(barberId: string): Product[] {
  return getData<Product>(PRODUCTS_STORAGE_KEY_PREFIX, barberId, defaultProducts);
}

export function saveBarberProducts(barberId: string, products: Product[]): boolean {
  return saveData<Product>(PRODUCTS_STORAGE_KEY_PREFIX, barberId, products);
}

export function addBarberProduct(barberId: string, product: Product): boolean {
  const products = getBarberProducts(barberId);
  return saveBarberProducts(barberId, [...products, product]);
}

export function updateBarberProduct(barberId: string, updatedProduct: Product): boolean {
    const products = getBarberProducts(barberId);
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index === -1) return false;
    const newProducts = [...products];
    newProducts[index] = updatedProduct;
    return saveBarberProducts(barberId, newProducts);
}

export function removeBarberProduct(barberId: string, productId: string): boolean {
    const products = getBarberProducts(barberId);
    const newProducts = products.filter(p => p.id !== productId);
    return saveBarberProducts(barberId, newProducts);
}


// --- Combos ---

export function getBarberCombos(barberId: string): Combo[] {
  return getData<Combo>(COMBOS_STORAGE_KEY_PREFIX, barberId, defaultCombos);
}

export function saveBarberCombos(barberId: string, combos: Combo[]): boolean {
  return saveData<Combo>(COMBOS_STORAGE_KEY_PREFIX, barberId, combos);
}

export function addBarberCombo(barberId: string, combo: Combo): boolean {
  const combos = getBarberCombos(barberId);
  return saveBarberCombos(barberId, [...combos, combo]);
}

export function updateBarberCombo(barberId: string, updatedCombo: Combo): boolean {
    const combos = getBarberCombos(barberId);
    const index = combos.findIndex(c => c.id === updatedCombo.id);
    if (index === -1) return false;
    const newCombos = [...combos];
    newCombos[index] = updatedCombo;
    return saveBarberCombos(barberId, newCombos);
}

export function removeBarberCombo(barberId: string, comboId: string): boolean {
    const combos = getBarberCombos(barberId);
    const newCombos = combos.filter(c => c.id !== comboId);
    return saveBarberCombos(barberId, newCombos);
}

// --- Combined Catalog ---
// Helper to get all bookable items (Services and Combos)
export function getBookableItems(barberId: string): (Service | Combo)[] {
    const services = getBarberServices(barberId);
    const combos = getBarberCombos(barberId);
    return [...services, ...combos];
}
