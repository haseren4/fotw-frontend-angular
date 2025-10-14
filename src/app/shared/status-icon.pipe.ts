import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusIcon',
  standalone: true
})
export class StatusIconPipe implements PipeTransform {
  transform(status: unknown): string {
    if (status === null || status === undefined) {
      return '/status_icons/status_scheduled.svg';
    }
    const s = String(status)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    // known statuses
    const known = new Set(['scheduled', 'on_air', 'completed']);
    const key = known.has(s) ? s : 'scheduled';
    return `/status_icons/status_${key}.svg`;
  }
}
