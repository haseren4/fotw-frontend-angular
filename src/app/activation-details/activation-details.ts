import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactsService, Contact } from '../contacts/contacts.service';
import { ActivationsService, Activation, ActivationPost } from '../activations/activations.service';
import { StatusIconPipe } from '../shared/status-icon.pipe';

interface TimelineItemBase {
  kind: 'contact' | 'post';
  ts: string; // ISO datetime string used for sorting/display
}

interface TimelineContact extends TimelineItemBase {
  kind: 'contact';
  contact: Contact;
}

interface TimelinePost extends TimelineItemBase {
  kind: 'post';
  post: ActivationPost;
}

export type TimelineItem = TimelineContact | TimelinePost;

@Component({
  selector: 'app-activation-details',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusIconPipe],
  templateUrl: './activation-details.html'
})
export class ActivationDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contactsSvc = inject(ContactsService);
  private activationsSvc = inject(ActivationsService);

  activationId: string | number | null = null;
  loading = true;
  error: string | null = null;

  activation: Activation | null = null;
  timeline: TimelineItem[] = [];

  ngOnInit(): void {
    this.activationId = this.route.snapshot.paramMap.get('id');
    if (!this.activationId) {
      this.error = 'No activation id provided.';
      this.loading = false;
      return;
    }
    const idStr = String(this.activationId);
    this.fetchActivation(idStr);
    this.fetchTimeline(idStr);
  }

  private fetchActivation(id: string): void {
    // Best-effort: query activations endpoint with id filter
    this.activationsSvc.getActivations({ id }).subscribe({
      next: (rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        const a = arr[0] as any;
        if (a) {
          const normalized = this.normalizeActivation(a as Activation);
          this.activation = normalized;
        }
      },
      error: () => {
        // Non-fatal: header info may be missing but timeline still shows
      }
    });
  }

  private fetchTimeline(id: string): void {
    this.loading = true;
    this.error = null;

    // Prepare tolerant params for contacts and posts
    const contactsParams: Record<string, string | number | boolean> = { activation_id: id };
    const postsParams: Record<string, string | number | boolean> = { activation_id: id };

    let contacts: Contact[] = [];
    let posts: ActivationPost[] = [];
    let contactsDone = false;
    let postsDone = false;

    const finalize = () => {
      if (!(contactsDone && postsDone)) return;
      // Normalize and merge
      const contactItems: TimelineItem[] = contacts
        .map(c => this.normalizeContact(c))
        .map(c => ({ kind: 'contact' as const, ts: (c.time as string) ?? '', contact: c }))
        .filter(it => !!it.ts && !isNaN(Date.parse(it.ts)));

      const postItems: TimelineItem[] = posts
        .map(p => this.normalizePost(p))
        .map(p => ({ kind: 'post' as const, ts: (p.createdAt as string) ?? '', post: p }))
        .filter(it => !!it.ts && !isNaN(Date.parse(it.ts)));

      const merged = [...contactItems, ...postItems];
      merged.sort((a, b) => (Date.parse(b.ts) || 0) - (Date.parse(a.ts) || 0));
      this.timeline = merged;
      this.loading = false;
    };

    this.contactsSvc.getContacts(contactsParams).subscribe({
      next: (rows) => { contacts = Array.isArray(rows) ? rows : []; contactsDone = true; finalize(); },
      error: (err) => { console.error('Failed to load contacts', err); this.error = this.error ?? 'Some data failed to load.'; contactsDone = true; finalize(); }
    });

    this.activationsSvc.getActivationPosts(postsParams).subscribe({
      next: (rows) => { posts = Array.isArray(rows) ? rows : []; postsDone = true; finalize(); },
      error: (err) => { console.error('Failed to load posts', err); this.error = this.error ?? 'Some data failed to load.'; postsDone = true; finalize(); }
    });
  }

  trackByTimeline = (index: number, item: TimelineItem) => {
    if (item.kind === 'contact') return `c-${(item.contact as any)?.id ?? index}`;
    return `p-${(item.post as any)?.id ?? index}`;
  };

  private normalizeActivation(a: Activation): Activation {
    const anyA: any = a as any;
    const startedAt = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
    const endedAt = a?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
    const siteId = a?.siteId ?? anyA['site_id'] ?? anyA?.site?.id;
    const callsign = a?.callsign ?? anyA?.user?.callsign ?? anyA?.['operator_callsign'];
    return { ...a, startedAt, endedAt, siteId, callsign } as Activation;
  }

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

  private normalizePost(p: ActivationPost): ActivationPost {
    const anyP: any = p as any;
    const activationId = p?.activationId ?? anyP['activation_id'];
    const createdAt = p?.createdAt ?? anyP['created_at'];
    const content = p?.content ?? anyP['body'] ?? anyP['content'];
    const author = p?.author ?? anyP['author_callsign'] ?? anyP['author'] ?? anyP['user']?.['callsign'] ?? anyP['callsign'];
    return { ...p, activationId, createdAt, content, author } as ActivationPost;
  }
}
