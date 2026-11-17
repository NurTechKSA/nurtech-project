import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null): string {
    if (minutes === null) {
      return '—';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${String(mins)}m`;
    }

    if (mins === 0) {
      return `${String(hours)}h`;
    }

    return `${String(hours)}h ${String(mins)}m`;
  }
}
