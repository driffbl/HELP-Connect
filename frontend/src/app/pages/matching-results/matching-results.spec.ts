import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchingResults } from './matching-results';


describe('MatchingResults', () => {
  let component: MatchingResults;
  let fixture: ComponentFixture<MatchingResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchingResults],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchingResults);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start in a loading state', () => {
    expect(component.isLoading).toBeTrue();
  });

  it('should open review modal when a volunteer is selected', () => {
    const mockVolunteer = {
      volunteer_id: 1,
      user_name: 'Test Volunteer',
      avatar_url: '',
      categories: [],
      availability_notes: '',
      preferred_mode: 'Virtual',
      rating: 5,
      completed_sessions: 10,
    };

    component.initiateSelection(mockVolunteer);
    expect(component.selectedVolunteer).toEqual(mockVolunteer);
    expect(component.showReviewModal).toBeTrue();
  });
});
