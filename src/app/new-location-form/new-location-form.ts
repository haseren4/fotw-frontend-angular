// src/app/new-location-form/new-location-form.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { LocationProposal } from './new-location-form-service';
import { NewLocationFormService } from './new-location-form-service';

function latValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = Number(ctrl.value);
  return Number.isFinite(v) && v >= -90 && v <= 90 ? null : { latRange: true };
}
function lonValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = Number(ctrl.value);
  return Number.isFinite(v) && v >= -180 && v <= 180 ? null : { lonRange: true };
}

@Component({
  selector: 'app-request-location',
  standalone: true, // ✅ important
  templateUrl: './new-location-form.html',
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class NewLocationFormComponent {
  private fb = inject(FormBuilder);
  private svc = inject(NewLocationFormService);

  submitting = false;
  submitError: string | null = null;
  submitSuccess = false;

  categories = [
    { value: 'STAR_FORT',        label: 'Star Fort / Trace Italienne' },
    { value: 'COASTAL_BATTERY',  label: 'Coastal Battery' },
    { value: 'EARTHWORK_REDOUT', label: 'Earthwork / Redoubt' },
    { value: 'CASTLE_FORT',      label: 'Castle / Fort' },
    { value: 'POST_INSTALLATION',label: 'On-Post Historic Site' },
    { value: 'MUSEUM',           label: 'Museum / Heritage Area' },
    { value: 'OTHER',            label: 'Other' }
  ];

  form = this.fb.nonNullable.group({
    proposed_by: ['', [Validators.required, Validators.maxLength(120)]],
    site_name:   ['', [Validators.required, Validators.maxLength(160)]],
    category:    ['', [Validators.required]],
    location:    ['', [Validators.required, Validators.maxLength(200)]],
    latitude:    ['', [Validators.required, latValidator]],
    longitude:   ['', [Validators.required, lonValidator]],
  });

  t(name: string) {
    const c = this.form.get(name);
    return !!(c && c.touched && c.invalid);
  }

  async onSubmit() {
    this.submitError = null;
    this.submitSuccess = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const v = this.form.getRawValue();
      const payload: LocationProposal = {
        proposed_by: v.proposed_by,
        site_name:   v.site_name,
        category:    v.category,
        location:    v.location,
        latitude:    Number(v.latitude),
        longitude:   Number(v.longitude),
      };

      console.log('[FOTA] submitting', payload); // quick visual that submit fires
      await firstValueFrom(this.svc.submitProposal(payload)); // single awaited POST

      this.submitSuccess = true;
      this.form.reset();
    } catch (e: any) {
      console.error('[FOTA] submit failed', e);
      this.submitError =
        e?.status === 404
          ? 'API not reachable. Check your dev proxy or API base URL (:8080).'
          : (e?.error?.message || 'Submission failed. Please try again.');
    } finally {
      this.submitting = false;
    }
  }
}
