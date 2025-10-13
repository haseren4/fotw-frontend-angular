import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {LocationMap} from '../location-map/location-map';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, RouterModule, LocationMap],
  templateUrl: './getting-started-public.html'
})
export class GettingStartedComponent {}
