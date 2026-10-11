import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string, letterLimit = 2): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, letterLimit)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}
