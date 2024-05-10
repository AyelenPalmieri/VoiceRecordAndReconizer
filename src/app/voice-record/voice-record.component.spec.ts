import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceRecordComponent } from './voice-record.component';

describe('VoiceRecordComponent', () => {
  let component: VoiceRecordComponent;
  let fixture: ComponentFixture<VoiceRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VoiceRecordComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiceRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
