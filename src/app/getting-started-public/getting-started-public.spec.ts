import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GettingStartedPublic } from './getting-started-public';

describe('GettingStartedPublic', () => {
  let component: GettingStartedPublic;
  let fixture: ComponentFixture<GettingStartedPublic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GettingStartedPublic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GettingStartedPublic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
