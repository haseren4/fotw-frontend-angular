import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterStatusbar } from './footer-statusbar';

describe('FooterStatusbar', () => {
  let component: FooterStatusbar;
  let fixture: ComponentFixture<FooterStatusbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterStatusbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterStatusbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
