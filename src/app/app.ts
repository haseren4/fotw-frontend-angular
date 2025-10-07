import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {HomeSummary} from './home-summary/home-summary';
import {HeaderNavbar} from './header-navbar/header-navbar';
import {FooterStatusbar} from './footer-statusbar/footer-statusbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderNavbar, FooterStatusbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fotw-frontend');
}
