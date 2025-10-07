import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentActivationsMap } from './current-activations-map';

describe('CurrentActivationsMap', () => {
  let component: CurrentActivationsMap;
  let fixture: ComponentFixture<CurrentActivationsMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentActivationsMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentActivationsMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
