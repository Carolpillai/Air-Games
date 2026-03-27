import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'flatten', standalone: true })
export class FlattenPipe implements PipeTransform {
    transform(value: number[][]): number[] {
        return (value || []).reduce((acc, row) => acc.concat(row), []);
    }
}
