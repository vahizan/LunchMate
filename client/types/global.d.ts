declare global {
  interface Window {
    google: any;
    initGoogleMapsCallback: () => void;
  }
}

export {};
