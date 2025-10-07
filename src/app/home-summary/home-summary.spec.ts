import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSummary } from './home-summary';

describe('HomeSummary', () => {
  let component: HomeSummary;
  let fixture: ComponentFixture<HomeSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
