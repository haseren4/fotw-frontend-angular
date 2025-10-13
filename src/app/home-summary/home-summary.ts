import { Component } from '@angular/core';
import {LocationMap} from '../location-map/location-map';

@Component({
  selector: 'app-home-summary',
  imports: [
    LocationMap
  ],
  templateUrl: './home-summary.html',
  styleUrl: './home-summary.css'
})
export class HomeSummary {

}
