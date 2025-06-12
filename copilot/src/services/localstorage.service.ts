import { isPlatformBrowser } from "@angular/common";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private platformId = inject(PLATFORM_ID);


  getItem(key: string): string | null {
    console.log('LocalStorageService.getItem called with key:', key);
    if (isPlatformBrowser(this.platformId)) {
      console.log('Accessing localStorage for key:', key, localStorage.getItem(key));
      return localStorage.getItem(key);
    }
    return null;
  }


  setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.setItem(key, value);
    }
  }
}






