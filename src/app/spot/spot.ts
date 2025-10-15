import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivationsService, Activation } from '../activations/activations.service';
import { UnderscoreToSpacePipe } from '../shared/underscore-to-space.pipe';

@Component({
  selector: 'app-spot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UnderscoreToSpacePipe],
  templateUrl: './spot.html'
})
export class SpotComponent implements OnInit {
  spotForm!: FormGroup;
  submitting = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  callsign: string | null = null;
  onAirActivations: Activation[] = [];

  constructor(
    private fb: FormBuilder,
    private activationsSvc: ActivationsService
  ) {}

  ngOnInit(): void {
    this.callsign = this.readCallsignFromCookies();

    this.spotForm = this.fb.group({
      activationId: ['', [Validators.required]],
      content: ['', [Validators.required, Validators.maxLength(2000)]],
      createdAtNow: [true, []]
    });

    // Load activations to assist selection (on-air or scheduled)
    this.activationsSvc.getActivations().subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        const filtered = arr.filter(a => {
          const anyA: any = a as any;
          const endedRaw = (a as any)?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
          const ended = endedRaw?.toString().trim();
          const onAir = !ended;
          return onAir; // Only on-air for the spot helper list
        });
        // Normalize startedAt for display if necessary
        this.onAirActivations = filtered.map(a => {
          const anyA: any = a as any;
          const startedAt = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
          const siteId = a?.siteId ?? anyA['site_id'] ?? anyA?.site?.id;
          const callsign = (a as any)?.callsign ?? anyA?.user?.callsign ?? anyA?.['operator_callsign'];
          return { ...a, startedAt, siteId, callsign } as Activation;
        });
      },
      error: () => { /* ignore helper list errors */ }
    });
  }

  submit(): void {
    this.submitError = null;
    this.submitSuccess = null;

    if (this.spotForm.invalid) {
      this.spotForm.markAllAsTouched();
      return;
    }

    const raw = this.spotForm.value;
    const payload: any = {
      activationId: String(raw.activationId).trim(),
      content: (raw.content ?? '').toString().trim()
    };
    // Attach logged-in user as author when available
    if (this.callsign && typeof this.callsign === 'string' && this.callsign.trim()) {
      payload.author = this.callsign.trim().toUpperCase();
    }
    if (raw.createdAtNow) {
      payload.createdAt = new Date().toISOString();
    }

    this.submitting = true;
    this.activationsSvc.createActivationPost(payload).subscribe({
      next: (created) => {
        this.submitting = false;
        this.submitSuccess = `Posted update to activation #${created?.activationId ?? payload.activationId}`;
        // keep activationId to allow multiple posts; clear content only
        this.spotForm.patchValue({ content: '' });
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.error?.message || 'Failed to submit spot.';
      }
    });
  }

  // Simple cookie reader copied from Dashboard (lightweight dependency)
  private readCallsignFromCookies(): string | null {
    try {
      const cookie = document.cookie ?? '';
      if (!cookie) return null;
      const map = new Map<string, string>();
      cookie.split(';').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) map.set(k.trim().toLowerCase(), decodeURIComponent((v ?? '').trim()));
      });
      const preferred = map.get('callsign');
      if (preferred) return preferred.toUpperCase();
      const fallbacks = ['auth', 'token', 'session', 'jid', 'jsessionid'];
      for (const name of fallbacks) {
        const val = map.get(name);
        if (val) return val;
      }
      return null;
    } catch {
      return null;
    }
  }
}
