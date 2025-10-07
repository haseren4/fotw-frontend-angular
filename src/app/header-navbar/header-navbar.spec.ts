import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderNavbar } from './header-navbar';

describe('HeaderNavbar', () => {
  let component: HeaderNavbar;
  let fixture: ComponentFixture<HeaderNavbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderNavbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderNavbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
