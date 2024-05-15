import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Observable, Subject, interval } from 'rxjs';
import { MatCardModule} from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  audioSentSuccessfully = false;
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();
  private buttonStateSubject = new Subject<boolean>();
  buttonState$: Observable<boolean> = this.buttonStateSubject.asObservable();

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    private readonly sanitizer: DomSanitizer,
    private snackBar: MatSnackBar
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

  sendAudioToServer(){
    if (!this.isRecording && !this.isActionInProgress && this.recordedBlob) {
      this.audioRecordingServices.sendAudioToServer(this.recordedBlob.blob, this.recordedBlob.title)
        .subscribe(
          response => {
            console.log('Archivo de audio enviado con exito al servidor');
            this.audioSentSuccessfully = true;
            this.snackBar.open('¡El archivo de audio se ha enviado con exito al servidor!', 'Cerrar', {
               duration: 3000,
            });
            this.audioSentSuccessfully = false;
          },
          error => {
            console.error('Error al enviar archivo de audio al servidor:', error);
            // Aquí puedes manejar errores, mostrar mensajes al usuario, etc.
          }
        );
    } else {
      console.error('No se grabó ningún audio o ya hay una grabación en curso.');
      // Aquí puedes mostrar un mensaje al usuario indicando que no hay grabación o que ya hay una grabación en curso.
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
      console.log(this.recordedBlob)
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
