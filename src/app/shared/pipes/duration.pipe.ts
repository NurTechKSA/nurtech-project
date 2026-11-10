import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) {
      return '—';
    }

    if (minutes === 0) {
      return '0m';
    }

    const hours = Math.floor(minutes / 60);

    const mins = minutes % 60;

    const parts = [
      hours > 0 ? `${String(hours)}h` : '',
      mins > 0 ? `${String(mins)}m` : '',
    ];

    return parts.filter((part) => part !== '').join(' ');
  }
}
