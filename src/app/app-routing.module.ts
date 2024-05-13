import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { VoiceRecordComponent } from './components/voice-record/voice-record.component';

const routes: Routes = [
  { path: './components/voice-record/voice-record.html', component: VoiceRecordComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
