import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginVerify } from './login-verify';

describe('LoginVerify', () => {
  let component: LoginVerify;
  let fixture: ComponentFixture<LoginVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginVerify],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginVerify);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
