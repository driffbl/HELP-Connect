import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentRequest } from './student-requests';

describe('StudentRequests', () => {
  let component: StudentRequest;
  let fixture: ComponentFixture<StudentRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentRequests],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentRequests);
    component = fixture.componentInstance;

    // Lock the date for predictable testing
    component.currentSystemDate = new Date('2026-10-11T00:00:00');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial requests', () => {
    expect(component.requests.length).toBeGreaterThan(0);
  });

  it('should return true for isStalePending when request is older than 3 days and Pending', () => {
    const staleRequest: StudentRequest = {
      request_id: 'R999',
      title: 'Old Request',
      category: 'Academic Support',
      volunteer_name: 'Test',
      created_at: '2026-10-01T00:00:00', // 10 days ago
      support_mode: 'Virtual',
      status: 'Pending',
    };
    expect(component.isStalePending(staleRequest)).toBeTrue();
  });

  it('should return false for isStalePending when request is recent', () => {
    const recentRequest: StudentRequest = {
      request_id: 'R998',
      title: 'New Request',
      category: 'Academic Support',
      volunteer_name: 'Test',
      created_at: '2026-10-10T00:00:00', // 1 day ago
      support_mode: 'Virtual',
      status: 'Pending',
    };
    expect(component.isStalePending(recentRequest)).toBeFalse();
  });

  it('should return false for isStalePending when request is not Pending', () => {
    const acceptedRequest: StudentRequest = {
      request_id: 'R997',
      title: 'Accepted Request',
      category: 'Academic Support',
      volunteer_name: 'Test',
      created_at: '2026-10-01T00:00:00',
      support_mode: 'Virtual',
      status: 'Accepted',
    };
    expect(component.isStalePending(acceptedRequest)).toBeFalse();
  });
});
