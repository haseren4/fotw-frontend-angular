import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactsService, Contact } from '../contacts/contacts.service';

@Component({
  selector: 'app-activation-contacts',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './activation-contacts.html'
})
export class ActivationContactsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contactsSvc = inject(ContactsService);

  activationId: string | number | null = null;
  loading = true;
  error: string | null = null;
  contacts: Contact[] = [];

  ngOnInit(): void {
    this.activationId = this.route.snapshot.paramMap.get('id');
    if (!this.activationId) {
      this.error = 'No activation id provided.';
      this.loading = false;
      return;
    }
    this.fetch(String(this.activationId));
  }

  private fetch(id: string): void {
    this.loading = true;
    this.error = null;

    // Be tolerant to different backend param names
    const params: Record<string, string | number | boolean> = {
      activation_id: id,
    };

    this.contactsSvc.getContacts(params).subscribe({
      next: (rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        this.contacts = arr.map(c => this.normalizeContact(c));
        // Sort newest first by time
        this.contacts.sort((a, b) => {
          const aTs = Date.parse((a.time as string) ?? '') || 0;
          const bTs = Date.parse((b.time as string) ?? '') || 0;
          return bTs - aTs;
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load contacts for activation', id, err);
        this.error = 'Failed to load contacts for this activation.';
        this.loading = false;
      }
    });
  }

  trackById = (index: number, item: Contact) => (item?.id ?? index);

  private normalizeContact(c: Contact): Contact {
    const anyC: any = c as any;
    const activationId = c?.activationId ?? anyC['activation_id'] ?? anyC['activationId'];
    const time = c?.time ?? anyC['time'] ?? anyC['timestamp'] ?? anyC['logged_at'] ?? anyC['qso_time'] ?? anyC['qso_datetime'];
    const callsign = c?.callsign ?? anyC['callsign'] ?? anyC['call'] ?? anyC['station_callsign'];
    const band = c?.band ?? anyC['band'];
    const mode = c?.mode ?? anyC['mode'];
    const rstSent = c?.rstSent ?? anyC['rst_sent'] ?? anyC['rst_tx'];
    const rstRcvd = c?.rstRcvd ?? anyC['rst_rcvd'] ?? anyC['rst_rx'];
    const notes = c?.notes ?? anyC['notes'] ?? anyC['comment'] ?? anyC['remarks'];
    return { ...c, activationId, time, callsign, band, mode, rstSent, rstRcvd, notes } as Contact;
  }
}
