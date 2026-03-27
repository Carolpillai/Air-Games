import { Component, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  protected readonly title = signal('frontend');

  @ViewChild('bgVideo') bgVideoRef!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit() {
    const video = this.bgVideoRef?.nativeElement;
    if (video) {
      // Angular doesn't properly bind the `muted` HTML attribute to the DOM property.
      // Setting it programmatically ensures Chrome/Safari autoplay policy is satisfied.
      video.muted = true;
      video.play().catch(() => {
        // Autoplay still blocked (very rare) — video will stay paused silently
      });
    }
  }
}
