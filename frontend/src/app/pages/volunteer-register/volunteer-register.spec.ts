import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolunteerRegister } from './volunteer-register';

describe('VolunteerRegister', () => {
  let component: VolunteerRegister;
  let fixture: ComponentFixture<VolunteerRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerRegister],
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
