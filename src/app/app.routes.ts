// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeSummary } from './home-summary/home-summary';
import { FutureRoadmap } from './future-roadmap/future-roadmap';
import { NewLocationFormComponent } from './new-location-form/new-location-form';
import {GettingStartedComponent} from './getting-started-public/getting-started-public';
import {SiteBrowserComponent} from './site-browser-component/site-browser-component'; // ← this file exports the class above
import {LocationMap} from './location-map/location-map';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard';

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
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Fortifications on the Air | Dashboard'
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
  },
  {
    path: 'location-map',
    component: LocationMap,
    title: 'Fortifications on the Air | Location Map'
  },
  {
    path: 'forms/register',
    component: RegisterComponent,
    title: 'Fortifications on the Air | Register'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Fortifications on the Air | Register'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Fortifications on the Air | Log in'
  },
  {
    path: 'activations',
    loadComponent: () => import('./activations/activations-list.component').then(m => m.ActivationsListComponent),
    title: 'Fortifications on the Air | Activations'
  },
  {
    path: 'spot',
    loadComponent: () => import('./spot/spot').then(m => m.SpotComponent),
    title: 'Fortifications on the Air | Spot an Update'
  },
  {
    path: 'on-air-map',
    loadComponent: () => import('./activations/on-air-map.component').then(m => m.OnAirMapComponent),
    title: 'Fortifications on the Air | On-Air Activations Map'
  }
];
