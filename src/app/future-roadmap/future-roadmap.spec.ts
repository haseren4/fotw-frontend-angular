import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FutureRoadmap } from './future-roadmap';

describe('FutureRoadmap', () => {
  let component: FutureRoadmap;
  let fixture: ComponentFixture<FutureRoadmap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FutureRoadmap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FutureRoadmap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
