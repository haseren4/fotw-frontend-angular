import { TestBed } from '@angular/core/testing';

import { NewLocationFormService } from './new-location-form-service';

describe('NewLocationFormService', () => {
  let service: NewLocationFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewLocationFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
