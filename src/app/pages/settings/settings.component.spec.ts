import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  it('saves editable shop settings without sending the primary key', async () => {
    TestBed.configureTestingModule({ imports: [SettingsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/settings').flush({ settingId: 1, shopName: 'ร้านเดิม', latitude: 16, longitude: 103,
      deliveryStartTime: '11:30:00', deliveryDeadline: '12:30:00', maxOrdersPerRider: 3,
      riderSpeedKmh: 30, boxSalePrice: 65, boxFoodCost: 40, riderBaseCost: 15, riderCostPerKm: 2 });
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[name="shopName"]')).not.toBeNull();
    fixture.componentInstance.draft!.shopName = 'ร้านใหม่';
    fixture.componentInstance.save();
    const request = http.expectOne('/api/settings');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.shopName).toBe('ร้านใหม่');
    expect(request.request.body.settingId).toBeUndefined();
    request.flush({ ...fixture.componentInstance.draft, settingId: 1 });
    http.verify();
  });
});
