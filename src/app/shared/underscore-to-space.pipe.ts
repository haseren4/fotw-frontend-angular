import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'underscoreToSpace',
  standalone: true
})
export class UnderscoreToSpacePipe implements PipeTransform {
  transform(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Replace all underscores with spaces
    return str.replace(/_/g, ' ');
  }
}
