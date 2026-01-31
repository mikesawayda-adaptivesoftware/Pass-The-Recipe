import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollPositionService {
  private scrollPositions = new Map<string, number>();

  /**
   * Save the current scroll position for a route
   */
  saveScrollPosition(routeKey: string): void {
    this.scrollPositions.set(routeKey, window.scrollY);
  }

  /**
   * Restore scroll position for a route (call after data has loaded)
   */
  restoreScrollPosition(routeKey: string): void {
    const position = this.scrollPositions.get(routeKey);
    if (position !== undefined && position > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo({ top: position, behavior: 'instant' });
      });
    }
  }

  /**
   * Clear saved position for a route
   */
  clearScrollPosition(routeKey: string): void {
    this.scrollPositions.delete(routeKey);
  }

  /**
   * Get the current saved position (useful for debugging)
   */
  getSavedPosition(routeKey: string): number | undefined {
    return this.scrollPositions.get(routeKey);
  }
}

