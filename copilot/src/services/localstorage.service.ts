import { isPlatformBrowser } from "@angular/common";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private platformId = inject(PLATFORM_ID);


  getItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Accessing localStorage for key:', key, localStorage.getItem(key));
      return localStorage.getItem(key);
    }
    return null;
  }


  setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Setting localStorage for key:', key, 'with value:', value);
      return localStorage.setItem(key, value);
    }
  }
}






