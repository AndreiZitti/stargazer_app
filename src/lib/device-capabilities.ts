// Device Capability Detection
// Used to show/hide features based on device support

/**
 * Check if DeviceOrientation API is available
 * This is required for compass/AR mode in Sky Lab
 */
export function hasDeviceOrientation(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if DeviceOrientationEvent exists
  if (typeof DeviceOrientationEvent === 'undefined') return false;

  // iOS 13+ requires permission request function
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    return true; // Available but requires permission
  }

  // Android/other browsers - check if event fires
  return 'ondeviceorientation' in window;
}

/**
 * Check if this is a mobile device (phone/tablet)
 * Used for UI adaptations
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if this is iOS (needs special handling for permissions)
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if touch is the primary input method
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if the app is running in standalone PWA mode
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if geolocation is available
 */
export function hasGeolocation(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'geolocation' in navigator;
}

/**
 * Request DeviceOrientation permission (iOS 13+)
 * Returns true if permission granted, false otherwise
 */
export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false;

  const DOE = DeviceOrientationEvent as any;
  if (typeof DOE.requestPermission !== 'function') {
    // Permission not required (Android, older iOS)
    return true;
  }

  try {
    const permission = await DOE.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}
