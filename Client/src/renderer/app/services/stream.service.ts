import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StreamData } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class StreamService {
  private streamsSubject = new BehaviorSubject<StreamData[]>([]);
  public streams$ = this.streamsSubject.asObservable();

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    // Listen for new stream updates
    (window as any).electronAPI.onStreamUpdate((streamData: any) => {
      this.addStream(streamData);
    });
  }

  private addStream(stream: StreamData): void {
    const currentStreams = this.streamsSubject.value;
    const existingIndex = currentStreams.findIndex(s => s.url === stream.url);
    
    if (existingIndex === -1) {
      // Add new stream
      const newStream: StreamData = {
        ...stream,
        id: stream.id || this.generateId(),
        timestamp: stream.timestamp || Date.now()
      };
      
      const updatedStreams = [newStream, ...currentStreams];
      this.streamsSubject.next(updatedStreams);
    } else {
      // Update existing stream
      const updatedStreams = [...currentStreams];
      updatedStreams[existingIndex] = {
        ...updatedStreams[existingIndex],
        ...stream
      };
      this.streamsSubject.next(updatedStreams);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getStreams(): StreamData[] {
    return this.streamsSubject.value;
  }

  getStreamById(id: string): StreamData | undefined {
    return this.streamsSubject.value.find(s => s.id === id);
  }

  getStreamByUrl(url: string): StreamData | undefined {
    return this.streamsSubject.value.find(s => s.url === url);
  }

  removeStream(id: string): void {
    const currentStreams = this.streamsSubject.value;
    const updatedStreams = currentStreams.filter(s => s.id !== id);
    this.streamsSubject.next(updatedStreams);
  }

  clearStreams(): void {
    this.streamsSubject.next([]);
  }

  getStreamsCount(): number {
    return this.streamsSubject.value.length;
  }

  getRecentStreams(limit: number = 10): StreamData[] {
    return this.streamsSubject.value
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}
