import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
// import * as RecordRTC from 'recordrtc';

@Component({
  selector: 'app-voice-record',
  templateUrl: './voice-record.component.html',
  styleUrls: ['./voice-record.component.css']
})

export class VoiceRecordComponent implements OnInit, OnDestroy {
  blobUrl: any;
  isRecording = false;
  startTime = '0:00';
  private recordedBlob!: RecordedBlob;

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    private readonly sanitizer: DomSanitizer
  ){
      this.getRecordedBlob();
      this.getRecordingTime();
      this.getRecordedFailed();
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
    if(!this.isRecording){
      console.log('start recording');
      this.isRecording = true;
      this.audioRecordingServices.startRecording();
    }
  }

  stopRecording(){
     if(!this.isRecording){
      console.log('stop recording');
      this.isRecording = false;
      this.audioRecordingServices.startRecording();
    }
  }

  deleteRecording(){
    this.blobUrl = null;
  }

  downloadRecording(){
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(this.recordedBlob.blob);
    downloadLink.download = this.recordedBlob.title;
    downloadLink.click();
    downloadLink.remove();
  }

  ngOnInit(): void {
    // throw new Error('Method not implemented.');
  }

  ngOnDestroy(): void {
    if(this.isRecording){
      this.isRecording = false;
      this.audioRecordingServices.stopRecording();
    }
  }

  // title = 'audio-record';
  // record: any;
  // recording = false;
  // deleteRecord = false;
  // url: any;
  // error: any;
  // constructor(private domSanitizer: DomSanitizer) { }

  // sanitize(url: string){
  //   return this.domSanitizer.bypassSecurityTrustUrl(url);
  // }

  // startRecording(){
  //   console.log('start recording');
  //   this.recording = true;
  //   this.deleteRecord = false;
  //   let mediaConstraints = {
  //     video: false,
  //     audio: true,
  //   };
  //   navigator.mediaDevices
  //     .getUserMedia(mediaConstraints)
  //     .then(this.successCallback.bind(this), this.errorCallback.bind(this));
  // }

  // successCallback(stream: MediaStream){
  //   // var options = {
  //   //   mimeType: 'audio/wav',
  //   //   numberOfAudioChannels: 1,
  //   //   sampleRate: 16000,
  //   // };
  //   var StereoAudioRecorder = RecordRTC.StereoAudioRecorder;
  //   this.record = new StereoAudioRecorder(stream, {
  //     // type: 'audio',
  //     mimeType: 'audio/wav',
  //   });
  //   this.record.record();
  // }

  // stopRecording(){
  //   console.log('stop recording');
  //   this.recording = false;
  //   this.deleteRecord = true;
  //   this.record.stop(this.processRecording.bind(this))
  // }

  // // processRecording(blob: any){
  // //   this.url = URL.createObjectURL(blob);
  // //   console.log('blob', blob);
  // //   console.log('url', this.url);
  // // }

  // processRecording(blob: Blob){
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     const base64String = reader.result as string;
  //     this.url = base64String;
  //     console.log('Blob convertido a Base64:', base64String);
  //   };
  //   reader.readAsDataURL(blob);
  // }

  // deleteRecording(){
  //   this.url = null;
  //   this.record = null;
  //   this.recording = false;
  //   this.deleteRecord = false;
  // }

  // downloadRecording() {
  //   if (!this.recording && this.url) {
  //     const downloadLink = document.createElement('a');
  //     downloadLink.href = this.url;
  //     downloadLink.download = 'consulta.wav';
  //     downloadLink.style.display = 'none';
  //     document.body.appendChild(downloadLink);
  //     downloadLink.click();
  //     document.body.removeChild(downloadLink);
  //   }
  // }

  // errorCallback(error: any){
  //   this.error = 'Can not play audio in your browser';
  // }

  // ngOnInit(): void {
  // }

}
