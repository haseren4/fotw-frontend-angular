import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivationsService, Activation, ActivationPost } from './activations.service';

interface ActivationWithLatest {
  activation: Activation;
  latestPost?: ActivationPost;
}

@Component({
  selector: 'app-activations-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activations-list.component.html',
  styleUrls: ['./activations-list.component.scss']
})
export class ActivationsListComponent implements OnInit {
  private svc = inject(ActivationsService);

  loading = true;
  error: string | null = null;
  items: ActivationWithLatest[] = [];

  ngOnInit(): void {
    this.loading = true;
    this.error = null;
    this.svc.getActivations()
      .subscribe({
        next: (activations) => {
          if (!Array.isArray(activations)) activations = [] as any;
          // Initialize cards with activation data
          this.items = activations.map(a => ({ activation: a }));
          // For each activation, fetch the latest post (best-effort)
          for (const item of this.items) {
            const id = item.activation?.id;
            if (id === undefined || id === null) continue;
            this.svc.getLatestPostForActivation(id).subscribe({
              next: (posts) => {
                const latest = Array.isArray(posts) && posts.length > 0 ? posts[0] : undefined;
                item.latestPost = latest;
              },
              error: () => {
                // Non-fatal; keep the activation visible
              }
            });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load activations', err);
          this.error = 'Failed to load activations.';
          this.loading = false;
        }
      });
  }

  trackById(index: number, item: ActivationWithLatest) {
    return item.activation?.id ?? index;
  }
}
