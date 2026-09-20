import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';

@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private readonly element: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.element.nativeElement.classList.add('reveal-ready');
    this.observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this.element.nativeElement.classList.add('reveal-visible');
      this.observer?.disconnect();
    }, { threshold: 0.08 });
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
