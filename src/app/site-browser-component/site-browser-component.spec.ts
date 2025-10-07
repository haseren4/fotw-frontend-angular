import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteBrowserComponent } from './site-browser-component';

describe('SiteBrowserComponent', () => {
  let component: SiteBrowserComponent;
  let fixture: ComponentFixture<SiteBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteBrowserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiteBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
