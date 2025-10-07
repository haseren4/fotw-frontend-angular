// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeSummary } from './home-summary/home-summary';
import { FutureRoadmap } from './future-roadmap/future-roadmap';
import { NewLocationFormComponent } from './new-location-form/new-location-form';
import {GettingStartedComponent} from './getting-started-public/getting-started-public';
import {SiteBrowserComponent} from './site-browser-component/site-browser-component'; // ← this file exports the class above

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeSummary,
    title: 'Fortifications on the Air | Home'
  },
  {
    path: 'forms/new-location',
    component: NewLocationFormComponent,
    title: 'Fortifications on the Air | Submit a New Location'
  },
  {
    path: 'roadmap',
    component: FutureRoadmap,
    title: 'Fortifications on the Air | Feature Roadmap'
  },
  {
    path: 'getting-started',
    component: GettingStartedComponent,
    title: 'Fortifications on the Air | Getting Started'
  },
  {
    path: 'site-browser',
    component: SiteBrowserComponent,
    title: 'Fortifications on the Air | Browse Sites'
  }
];
