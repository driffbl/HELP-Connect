import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolunteerInbox } from './volunteer-inbox';

describe('VolunteerInbox', () => {
  let component: VolunteerInbox;
  let fixture: ComponentFixture<VolunteerInbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerInbox],
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerInbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial incoming requests', () => {
    expect(component.incomingRequests.length).toBeGreaterThan(0);
    expect(component.pendingRequests.length).toEqual(component.incomingRequests.length);
  });

  it('should change status to Accepted when onAcceptRequest is called', () => {
    const request = component.pendingRequests[0];
    component.onAcceptRequest(request);
    expect(request.status).toBe('Accepted');
  });

  it('should change status to Rejected when onRejectRequest is called', () => {
    const request = component.pendingRequests[0];
    component.onRejectRequest(request);
    expect(request.status).toBe('Rejected');
  });
});
