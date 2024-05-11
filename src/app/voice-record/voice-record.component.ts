import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Observable, Subject, interval } from 'rxjs';
import { MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-voice-record',
  templateUrl: './voice-record.component.html',
  styleUrls: ['./voice-record.component.css'],
})

export class VoiceRecordComponent implements OnInit, OnDestroy {
  blobUrl: any;
  isRecording = false;
  isActionInProgress = false;
  startTime = '0:00';
  isBlinking = false;
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();
  private buttonStateSubject = new Subject<boolean>();
  buttonState$: Observable<boolean> = this.buttonStateSubject.asObservable();

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    private readonly sanitizer: DomSanitizer
  ){
      this.getRecordedBlob();
      this.getRecordingTime();
      this.getRecordedFailed();
  }


  ngOnInit(): void {
    this.getRecordedCompleted();
  }

  private getRecordedCompleted(){
    this.audioRecordingServices.getRecordedCompleted().subscribe(() => {
    });
  }

  private getRecordedBlob(){
    this.audioRecordingServices.getRecordedBlob().subscribe(data => {
      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(data.blob));
      this.recordedBlob = data;
    })
  }

  private getRecordingTime(){
    this.audioRecordingServices.getRecordingTime().subscribe(data =>
      this.startTime = data
    );
  }

  private getRecordedFailed(){
    this.audioRecordingServices.getRecordingTime().subscribe(data =>
      this.isRecording = false
    );
  }

  startRecording(){
    if(!this.isRecording && !this.isActionInProgress){
      console.log('start recording');
      console.log(this.isRecording)
      this.isActionInProgress = true;
      this.isRecording = true;
      this.buttonStateSubject.next(true);
      this.startBlinking();
      console.log(this.isRecording)
      this.audioRecordingServices.startRecording();
      this.blobUrl = null;
    }
  }

  stopRecording(){
     if(!this.isRecording){
      console.log('stop recording');
      this.isRecording = false;
      this.buttonStateSubject.next(false);
      this.stopBlinking();
      this.audioRecordingServices.stopRecording();
      this.isActionInProgress = false;
    }
  }

  startBlinking() {
    this.isBlinking = true;
    interval(1000)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.isBlinking = !this.isBlinking;
      });
  }

  stopBlinking() {
    this.isBlinking = false;
  }

  deleteRecording(){
    if (!this.isRecording && !this.isActionInProgress){
      console.log('delete recorded')
      this.audioRecordingServices.deleteRecording();
      this.blobUrl = null;
    }
  }

  downloadRecording(){
    if (!this.isRecording && !this.isActionInProgress){
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(this.recordedBlob.blob);
      downloadLink.download = this.recordedBlob.title;
      console.log('download recorded')
      downloadLink.click();
      downloadLink.remove();
    }
  }


  ngOnDestroy(): void {
    if(this.isRecording){
      this.isRecording = false;
      this.audioRecordingServices.stopRecording();
      this.ngUnsubscribe.next();
      this.ngUnsubscribe.complete();
    }
  }

}
