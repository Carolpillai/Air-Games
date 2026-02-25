import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AirPong } from './air-pong';

describe('AirPong', () => {
  let component: AirPong;
  let fixture: ComponentFixture<AirPong>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AirPong]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AirPong);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
