import { TestBed } from '@angular/core/testing';
import { NearbySearchComponent } from './nearby-search.component';
import { vi } from 'vitest';

describe('coordinate search validation',()=>{
  it('accepts zero coordinates but rejects missing and out-of-range values',()=>{
    TestBed.configureTestingModule({imports:[NearbySearchComponent]});
    const fixture=TestBed.createComponent(NearbySearchComponent);
    fixture.componentRef.setInput('radiusKm',1);fixture.componentRef.setInput('subject','ลูกค้า');
    const search=fixture.componentInstance;
    const emit=vi.spyOn(search.searched,'emit');
    search.search();expect(emit).not.toHaveBeenCalled();
    search.lat=91;search.lng=103;search.search();expect(emit).not.toHaveBeenCalled();
    search.lat=0;search.lng=0;search.search();expect(emit).toHaveBeenCalledWith({lat:0,lng:0});
    expect(search.error).toBe('');
  });
});
