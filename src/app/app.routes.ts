import { Routes } from '@angular/router';
import {HomeSummary} from './home-summary/home-summary';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path : 'home',
    component: HomeSummary ,
    title: 'Fortifications on the Air | Home'
  }
];
